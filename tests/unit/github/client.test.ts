import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubClient } from '../../../src/github/client.js';
import {
  mockIssue,
  mockBlockingIssues,
  mockSubIssues,
  mockParentIssue,
} from '../../fixtures/github-responses.js';

// Create mock request function
const mockRequest = vi.fn();

// Mock Octokit as a class
vi.mock('@octokit/rest', () => ({
  Octokit: class MockOctokit {
    request = mockRequest;
    constructor() {}
  },
}));

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubClient('fake-token');
  });

  describe('getBlockedBy', () => {
    it('should return blocking issues', async () => {
      mockRequest.mockResolvedValueOnce({ data: mockBlockingIssues });

      const result = await client.getBlockedBy('testowner', 'testrepo', 5);

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 5,
        })
      );
      expect(result).toEqual(mockBlockingIssues);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no blockers', async () => {
      mockRequest.mockResolvedValueOnce({ data: [] });

      const result = await client.getBlockedBy('testowner', 'testrepo', 5);

      expect(result).toEqual([]);
    });
  });

  describe('getBlocking', () => {
    it('should return issues being blocked', async () => {
      mockRequest.mockResolvedValueOnce({ data: [mockIssue] });

      const result = await client.getBlocking('testowner', 'testrepo', 10);

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 10,
        })
      );
      expect(result).toEqual([mockIssue]);
    });

    it('should return empty array when not blocking any issues', async () => {
      mockRequest.mockResolvedValueOnce({ data: [] });

      const result = await client.getBlocking('testowner', 'testrepo', 10);

      expect(result).toEqual([]);
    });
  });

  describe('addBlockingDependency', () => {
    it('should add blocking dependency and return success', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.addBlockingDependency('testowner', 'testrepo', 5, 100);

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 5,
          issue_id: 100,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('#5');
      expect(result.message).toContain('100');
    });
  });

  describe('removeBlockingDependency', () => {
    it('should remove blocking dependency and return success', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.removeBlockingDependency('testowner', 'testrepo', 5, 100);

      expect(mockRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 5,
          issue_id: 100,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('100');
      expect(result.message).toContain('#5');
    });
  });

  describe('getParentIssue', () => {
    it('should return parent issue when it exists', async () => {
      mockRequest.mockResolvedValueOnce({ data: mockParentIssue });

      const result = await client.getParentIssue('testowner', 'testrepo', 101);

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/parent',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 101,
        })
      );
      expect(result).toEqual(mockParentIssue);
    });

    it('should return null when no parent exists (404)', async () => {
      const error = new Error('Not Found') as Error & { status: number };
      error.status = 404;
      mockRequest.mockRejectedValueOnce(error);

      const result = await client.getParentIssue('testowner', 'testrepo', 101);

      expect(result).toBeNull();
    });

    it('should throw for non-404 errors', async () => {
      const error = new Error('Internal Server Error') as Error & { status: number };
      error.status = 500;
      mockRequest.mockRejectedValueOnce(error);

      await expect(client.getParentIssue('testowner', 'testrepo', 101)).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });

  describe('listSubIssues', () => {
    it('should return sub-issues', async () => {
      mockRequest.mockResolvedValueOnce({ data: mockSubIssues });

      const result = await client.listSubIssues('testowner', 'testrepo', 50);

      expect(mockRequest).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
        })
      );
      expect(result).toEqual(mockSubIssues);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no sub-issues', async () => {
      mockRequest.mockResolvedValueOnce({ data: [] });

      const result = await client.listSubIssues('testowner', 'testrepo', 50);

      expect(result).toEqual([]);
    });
  });

  describe('addSubIssue', () => {
    it('should add sub-issue and return success', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.addSubIssue({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000001,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
          replace_parent: false,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('200000001');
      expect(result.message).toContain('#50');
    });

    it('should add sub-issue with replace_parent flag', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.addSubIssue({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000001,
        replaceParent: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues',
        expect.objectContaining({
          replace_parent: true,
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('removeSubIssue', () => {
    it('should remove sub-issue and return success', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.removeSubIssue('testowner', 'testrepo', 50, 200000001);

      expect(mockRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000001,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('200000001');
      expect(result.message).toContain('#50');
    });
  });

  describe('reprioritizeSubIssue', () => {
    it('should reprioritize with after_id', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.reprioritizeSubIssue({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000002,
        afterId: 200000001,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
          after_id: 200000001,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('after issue ID 200000001');
    });

    it('should reprioritize with before_id', async () => {
      mockRequest.mockResolvedValueOnce({ data: {} });

      const result = await client.reprioritizeSubIssue({
        owner: 'testowner',
        repo: 'testrepo',
        parentIssueNumber: 50,
        subIssueId: 200000002,
        beforeId: 200000003,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        'PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority',
        expect.objectContaining({
          owner: 'testowner',
          repo: 'testrepo',
          issue_number: 50,
          sub_issue_id: 200000002,
          before_id: 200000003,
        })
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('before issue ID 200000003');
    });
  });
});
