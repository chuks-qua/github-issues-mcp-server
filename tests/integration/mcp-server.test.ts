import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  mockBlockingIssues,
  mockSubIssues,
  mockParentIssue,
  mockIssue,
} from '../fixtures/github-responses.js';

// Type helper for tool results
interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// Create mock functions for GitHubClient methods
const mockGetBlockedBy = vi.fn();
const mockGetBlocking = vi.fn();
const mockAddBlockingDependency = vi.fn();
const mockRemoveBlockingDependency = vi.fn();
const mockGetParentIssue = vi.fn();
const mockListSubIssues = vi.fn();
const mockAddSubIssue = vi.fn();
const mockRemoveSubIssue = vi.fn();
const mockReprioritizeSubIssue = vi.fn();

// Mock config before importing server
vi.mock('../../src/config.js', () => ({
  loadConfig: () => ({ githubToken: 'test-token' }),
}));

// Mock GitHubClient as a class
vi.mock('../../src/github/client.js', () => ({
  GitHubClient: class MockGitHubClient {
    getBlockedBy = mockGetBlockedBy;
    getBlocking = mockGetBlocking;
    addBlockingDependency = mockAddBlockingDependency;
    removeBlockingDependency = mockRemoveBlockingDependency;
    getParentIssue = mockGetParentIssue;
    listSubIssues = mockListSubIssues;
    addSubIssue = mockAddSubIssue;
    removeSubIssue = mockRemoveSubIssue;
    reprioritizeSubIssue = mockReprioritizeSubIssue;
    constructor() {}
  },
}));

describe('MCP Server Integration', () => {
  let client: Client;
  let clientTransport: InstanceType<typeof InMemoryTransport>;
  let serverTransport: InstanceType<typeof InMemoryTransport>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create linked transport pair
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // Import server after mocks are set up
    const { createServer } = await import('../../src/server.js');
    const server = createServer();
    await server.connect(serverTransport);

    // Create and connect client
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await clientTransport.close();
    await serverTransport.close();
  });

  describe('listTools', () => {
    it('should list all 9 tools', async () => {
      const result = await client.listTools();

      expect(result.tools).toHaveLength(9);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('github_get_blocked_by');
      expect(toolNames).toContain('github_get_blocking');
      expect(toolNames).toContain('github_add_blocking_dependency');
      expect(toolNames).toContain('github_remove_blocking_dependency');
      expect(toolNames).toContain('github_get_parent_issue');
      expect(toolNames).toContain('github_list_sub_issues');
      expect(toolNames).toContain('github_add_sub_issue');
      expect(toolNames).toContain('github_remove_sub_issue');
      expect(toolNames).toContain('github_reprioritize_sub_issue');
    });
  });

  describe('github_get_blocked_by tool', () => {
    it('should return formatted list when issues exist', async () => {
      mockGetBlockedBy.mockResolvedValueOnce(mockBlockingIssues);

      const result = (await client.callTool({
        name: 'github_get_blocked_by',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 5 },
      })) as ToolResult;

      expect(mockGetBlockedBy).toHaveBeenCalledWith('testowner', 'testrepo', 5);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('2 blocking issue(s)'),
      });
      expect(result.content[0].text).toContain('#10');
      expect(result.content[0].text).toContain('#20');
    });

    it('should return empty message when no blockers', async () => {
      mockGetBlockedBy.mockResolvedValueOnce([]);

      const result = (await client.callTool({
        name: 'github_get_blocked_by',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 5 },
      })) as ToolResult;

      expect(result.content[0].text).toContain('is not blocked by any issues');
    });
  });

  describe('github_get_blocking tool', () => {
    it('should return formatted list when blocking issues exist', async () => {
      mockGetBlocking.mockResolvedValueOnce([mockIssue]);

      const result = await client.callTool({
        name: 'github_get_blocking',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 10 },
      });

      expect(mockGetBlocking).toHaveBeenCalledWith('testowner', 'testrepo', 10);
      expect((result.content[0] as { text: string }).text).toContain('Blocking 1 issue(s)');
    });

    it('should return empty message when not blocking any issues', async () => {
      mockGetBlocking.mockResolvedValueOnce([]);

      const result = await client.callTool({
        name: 'github_get_blocking',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 10 },
      });

      expect((result.content[0] as { text: string }).text).toContain('is not blocking any issues');
    });
  });

  describe('github_add_blocking_dependency tool', () => {
    it('should add dependency and return success message', async () => {
      mockAddBlockingDependency.mockResolvedValueOnce({
        success: true,
        message: 'Issue #5 is now blocked by issue ID 100',
      });

      const result = await client.callTool({
        name: 'github_add_blocking_dependency',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 5,
          blocking_issue_id: 100,
        },
      });

      expect(mockAddBlockingDependency).toHaveBeenCalledWith('testowner', 'testrepo', 5, 100);
      expect((result.content[0] as { text: string }).text).toContain('Issue #5 is now blocked');
    });
  });

  describe('github_remove_blocking_dependency tool', () => {
    it('should remove dependency and return success message', async () => {
      mockRemoveBlockingDependency.mockResolvedValueOnce({
        success: true,
        message: 'Removed blocking dependency',
      });

      const result = await client.callTool({
        name: 'github_remove_blocking_dependency',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 5,
          blocking_issue_id: 100,
        },
      });

      expect(mockRemoveBlockingDependency).toHaveBeenCalledWith('testowner', 'testrepo', 5, 100);
      expect((result.content[0] as { text: string }).text).toContain('Removed blocking dependency');
    });
  });

  describe('github_get_parent_issue tool', () => {
    it('should return parent issue when it exists', async () => {
      mockGetParentIssue.mockResolvedValueOnce(mockParentIssue);

      const result = await client.callTool({
        name: 'github_get_parent_issue',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 101 },
      });

      expect(mockGetParentIssue).toHaveBeenCalledWith('testowner', 'testrepo', 101);
      expect((result.content[0] as { text: string }).text).toContain('is a sub-issue of');
      expect((result.content[0] as { text: string }).text).toContain('#50');
    });

    it('should return no parent message when none exists', async () => {
      mockGetParentIssue.mockResolvedValueOnce(null);

      const result = await client.callTool({
        name: 'github_get_parent_issue',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 101 },
      });

      expect((result.content[0] as { text: string }).text).toContain('has no parent issue');
    });
  });

  describe('github_list_sub_issues tool', () => {
    it('should return formatted list of sub-issues', async () => {
      mockListSubIssues.mockResolvedValueOnce(mockSubIssues);

      const result = await client.callTool({
        name: 'github_list_sub_issues',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 50 },
      });

      expect(mockListSubIssues).toHaveBeenCalledWith('testowner', 'testrepo', 50);
      expect((result.content[0] as { text: string }).text).toContain('3 sub-issue(s)');
      expect((result.content[0] as { text: string }).text).toContain('#101');
      expect((result.content[0] as { text: string }).text).toContain('#102');
      expect((result.content[0] as { text: string }).text).toContain('#103');
    });

    it('should return empty message when no sub-issues', async () => {
      mockListSubIssues.mockResolvedValueOnce([]);

      const result = await client.callTool({
        name: 'github_list_sub_issues',
        arguments: { owner: 'testowner', repo: 'testrepo', issue_number: 50 },
      });

      expect((result.content[0] as { text: string }).text).toContain('has no sub-issues');
    });
  });

  describe('github_add_sub_issue tool', () => {
    it('should add sub-issue and return success', async () => {
      mockAddSubIssue.mockResolvedValueOnce({
        success: true,
        message: 'Issue ID 200000001 is now a sub-issue of #50',
      });

      const result = await client.callTool({
        name: 'github_add_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        },
      });

      expect(mockAddSubIssue).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000001,
        replaceParent: false,
      });
      expect((result.content[0] as { text: string }).text).toContain('is now a sub-issue');
    });

    it('should pass replace_parent flag when true', async () => {
      mockAddSubIssue.mockResolvedValueOnce({
        success: true,
        message: 'Issue ID 200000001 is now a sub-issue of #50',
      });

      await client.callTool({
        name: 'github_add_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          replace_parent: true,
        },
      });

      expect(mockAddSubIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          replaceParent: true,
        })
      );
    });
  });

  describe('github_remove_sub_issue tool', () => {
    it('should remove sub-issue and return success', async () => {
      mockRemoveSubIssue.mockResolvedValueOnce({
        success: true,
        message: 'Issue ID 200000001 is no longer a sub-issue of #50',
      });

      const result = await client.callTool({
        name: 'github_remove_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        },
      });

      expect(mockRemoveSubIssue).toHaveBeenCalledWith('testowner', 'testrepo', 50, 200000001);
      expect((result.content[0] as { text: string }).text).toContain('is no longer a sub-issue');
    });
  });

  describe('github_reprioritize_sub_issue tool', () => {
    it('should reprioritize with after_id', async () => {
      mockReprioritizeSubIssue.mockResolvedValueOnce({
        success: true,
        message: 'Sub-issue ID 200000002 moved after issue ID 200000001',
      });

      const result = await client.callTool({
        name: 'github_reprioritize_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
          after_id: 200000001,
        },
      });

      expect(mockReprioritizeSubIssue).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000002,
        afterId: 200000001,
        beforeId: undefined,
      });
      expect((result.content[0] as { text: string }).text).toContain('moved after');
    });

    it('should reprioritize with before_id', async () => {
      mockReprioritizeSubIssue.mockResolvedValueOnce({
        success: true,
        message: 'Sub-issue ID 200000002 moved before issue ID 200000003',
      });

      const result = await client.callTool({
        name: 'github_reprioritize_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
          before_id: 200000003,
        },
      });

      expect(mockReprioritizeSubIssue).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000002,
        afterId: undefined,
        beforeId: 200000003,
      });
      expect((result.content[0] as { text: string }).text).toContain('moved before');
    });

    it('should return error when neither after_id nor before_id provided', async () => {
      const result = await client.callTool({
        name: 'github_reprioritize_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
        },
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'Must specify either after_id or before_id'
      );
      expect(mockReprioritizeSubIssue).not.toHaveBeenCalled();
    });

    it('should return error when both after_id and before_id provided', async () => {
      const result = await client.callTool({
        name: 'github_reprioritize_sub_issue',
        arguments: {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
          after_id: 200000001,
          before_id: 200000003,
        },
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toContain(
        'Specify only one of after_id or before_id'
      );
      expect(mockReprioritizeSubIssue).not.toHaveBeenCalled();
    });
  });
});
