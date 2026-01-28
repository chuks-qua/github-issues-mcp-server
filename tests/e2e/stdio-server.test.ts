/**
 * End-to-end tests for the MCP server via stdio protocol.
 *
 * These tests spawn the actual server process and communicate via stdio,
 * with GitHub API mocked using a local HTTP server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMockGitHubServer } from './mocks/mock-github-server.js';
import { spawnServer, killServer, type SpawnedServer } from './helpers/spawn-server.js';
import { StdioMcpClient } from './helpers/mcp-client.js';

describe('MCP Server E2E via stdio', () => {
  let mockGitHub: Awaited<ReturnType<typeof createMockGitHubServer>>;
  let server: SpawnedServer;
  let client: StdioMcpClient;

  beforeAll(async () => {
    // Start mock GitHub API server
    mockGitHub = await createMockGitHubServer();

    // Spawn the actual MCP server process with custom GitHub API base URL
    server = await spawnServer({
      GITHUB_TOKEN: 'test-token-for-e2e',
      GITHUB_API_BASE_URL: mockGitHub.baseUrl,
    });
    client = new StdioMcpClient(server.stdin, server.stdout);

    // Initialize the MCP connection
    await client.initialize();
  });

  afterAll(async () => {
    // Clean up
    client.close();
    await killServer(server);
    await mockGitHub.close();
  });

  describe('Protocol Compliance', () => {
    it('should list all 9 tools', async () => {
      const result = await client.listTools();

      expect(result.tools).toHaveLength(9);

      const toolNames = result.tools.map((t) => t.name).sort();
      expect(toolNames).toEqual([
        'github_add_blocking_dependency',
        'github_add_sub_issue',
        'github_get_blocked_by',
        'github_get_blocking',
        'github_get_parent_issue',
        'github_list_sub_issues',
        'github_remove_blocking_dependency',
        'github_remove_sub_issue',
        'github_reprioritize_sub_issue',
      ]);
    });

    it('should have correct schema for github_get_blocked_by tool', async () => {
      const result = await client.listTools();
      const tool = result.tools.find((t) => t.name === 'github_get_blocked_by');

      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('owner');
      expect(tool?.inputSchema.required).toContain('repo');
      expect(tool?.inputSchema.required).toContain('issue_number');
    });
  });

  describe('Dependency Tools', () => {
    describe('github_get_blocked_by', () => {
      it('should return blocking issues in markdown format', async () => {
        const result = await client.callTool('github_get_blocked_by', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Blocker Issue 1');
        expect(result.content[0].text).toContain('Blocker Issue 2');
      });

      it('should return blocking issues in JSON format', async () => {
        const result = await client.callTool('github_get_blocked_by', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
          format: 'json',
        });

        expect(result.isError).toBeFalsy();
        expect(result.structuredContent).toBeDefined();

        const structured = result.structuredContent as {
          blocked_by: Array<{ number: number; title: string }>;
        };
        expect(structured.blocked_by).toHaveLength(2);
        expect(structured.blocked_by[0].number).toBe(10);
      });

      it('should return empty list for issue with no blockers', async () => {
        const result = await client.callTool('github_get_blocked_by', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 1,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('not blocked by any issues');
      });

      it('should handle pagination with limit and offset', async () => {
        const result = await client.callTool('github_get_blocked_by', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
          limit: 1,
          offset: 0,
        });

        expect(result.isError).toBeFalsy();
        // Should show pagination info
        expect(result.content[0].text).toContain('1');
      });
    });

    describe('github_get_blocking', () => {
      it('should return issues being blocked', async () => {
        const result = await client.callTool('github_get_blocking', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Blocker Issue');
      });
    });

    describe('github_add_blocking_dependency', () => {
      it('should add a blocking dependency', async () => {
        const result = await client.callTool('github_add_blocking_dependency', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
          blocking_issue_id: 100000001,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('blocked by');
      });
    });

    describe('github_remove_blocking_dependency', () => {
      it('should remove a blocking dependency', async () => {
        const result = await client.callTool('github_remove_blocking_dependency', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
          blocking_issue_id: 100000001,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Removed');
      });
    });
  });

  describe('Sub-Issue Tools', () => {
    describe('github_get_parent_issue', () => {
      it('should return parent issue when it exists', async () => {
        const result = await client.callTool('github_get_parent_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 42,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Parent Issue');
        expect(result.content[0].text).toContain('#50');
      });

      it('should return null message when no parent exists', async () => {
        const result = await client.callTool('github_get_parent_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 1,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('no parent');
      });
    });

    describe('github_list_sub_issues', () => {
      it('should list sub-issues in markdown format', async () => {
        const result = await client.callTool('github_list_sub_issues', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('Sub-issue 1');
        expect(result.content[0].text).toContain('Sub-issue 2');
        expect(result.content[0].text).toContain('Sub-issue 3');
      });

      it('should list sub-issues in JSON format', async () => {
        const result = await client.callTool('github_list_sub_issues', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          format: 'json',
        });

        expect(result.isError).toBeFalsy();
        expect(result.structuredContent).toBeDefined();

        const structured = result.structuredContent as {
          sub_issues: Array<{ number: number }>;
        };
        expect(structured.sub_issues).toHaveLength(3);
      });

      it('should return empty list for issue with no sub-issues', async () => {
        const result = await client.callTool('github_list_sub_issues', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 1,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('has no sub-issues');
      });
    });

    describe('github_add_sub_issue', () => {
      it('should add a sub-issue', async () => {
        const result = await client.callTool('github_add_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('sub-issue');
      });

      it('should add a sub-issue with replace_parent flag', async () => {
        const result = await client.callTool('github_add_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          replace_parent: true,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('sub-issue');
      });
    });

    describe('github_remove_sub_issue', () => {
      it('should remove a sub-issue', async () => {
        const result = await client.callTool('github_remove_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('no longer');
      });
    });

    describe('github_reprioritize_sub_issue', () => {
      it('should reprioritize with after_id', async () => {
        const result = await client.callTool('github_reprioritize_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          after_id: 200000002,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('moved');
        expect(result.content[0].text).toContain('after');
      });

      it('should reprioritize with before_id', async () => {
        const result = await client.callTool('github_reprioritize_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          before_id: 200000002,
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('moved');
        expect(result.content[0].text).toContain('before');
      });

      it('should reject when neither after_id nor before_id is provided', async () => {
        const result = await client.callTool('github_reprioritize_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        });

        expect(result.isError).toBe(true);
        // The error message should mention the validation issue
        expect(result.content[0].text).toBeDefined();
      });

      it('should reject when both after_id and before_id are provided', async () => {
        const result = await client.callTool('github_reprioritize_sub_issue', {
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          after_id: 200000002,
          before_id: 200000003,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent issue gracefully', async () => {
      const result = await client.callTool('github_get_blocked_by', {
        owner: 'testowner',
        repo: 'testrepo',
        issue_number: 9999,
      });

      expect(result.isError).toBe(true);
    });

    it('should return error for invalid tool name', async () => {
      const result = await client.callTool('invalid_tool_name', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });
});
