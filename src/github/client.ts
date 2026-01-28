/**
 * GitHub API client for Issue Relationships (Dependencies and Sub-Issues).
 */

import { Octokit } from "@octokit/rest";
import type {
  IssueReference,
  AddDependencyResult,
  RemoveDependencyResult,
  AddSubIssueParams,
  ReprioritizeSubIssueParams,
} from "./types.js";

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string, baseUrl?: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: "github-issues-mcp/1.0.0",
      ...(baseUrl && { baseUrl }),
    });
  }

  // ==================== Issue Dependencies ====================

  /**
   * Get issues that are blocking a specific issue.
   * GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by
   */
  async getBlockedBy(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueReference[]> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
      {
        owner,
        repo,
        issue_number: issueNumber,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return response.data as IssueReference[];
  }

  /**
   * Get issues that a specific issue is blocking.
   * GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking
   */
  async getBlocking(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueReference[]> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking",
      {
        owner,
        repo,
        issue_number: issueNumber,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return response.data as IssueReference[];
  }

  /**
   * Add a blocking dependency to an issue.
   * POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by
   */
  async addBlockingDependency(
    owner: string,
    repo: string,
    issueNumber: number,
    blockingIssueId: number
  ): Promise<AddDependencyResult> {
    await this.octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
      {
        owner,
        repo,
        issue_number: issueNumber,
        issue_id: blockingIssueId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return {
      success: true,
      message: `Issue #${issueNumber} is now blocked by issue ID ${blockingIssueId}`,
    };
  }

  /**
   * Remove a blocking dependency from an issue.
   * DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}
   */
  async removeBlockingDependency(
    owner: string,
    repo: string,
    issueNumber: number,
    blockingIssueId: number
  ): Promise<RemoveDependencyResult> {
    await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}",
      {
        owner,
        repo,
        issue_number: issueNumber,
        issue_id: blockingIssueId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return {
      success: true,
      message: `Removed blocking dependency: issue ID ${blockingIssueId} no longer blocks #${issueNumber}`,
    };
  }

  // ==================== Sub-Issues ====================

  /**
   * Get the parent issue of a sub-issue.
   * GET /repos/{owner}/{repo}/issues/{issue_number}/parent
   */
  async getParentIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueReference | null> {
    try {
      const response = await this.octokit.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/parent",
        {
          owner,
          repo,
          issue_number: issueNumber,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      return response.data as IssueReference;
    } catch (error: unknown) {
      // 404 means no parent issue exists
      if (
        error instanceof Error &&
        "status" in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all sub-issues of a parent issue.
   * GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues
   */
  async listSubIssues(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<IssueReference[]> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
      {
        owner,
        repo,
        issue_number: issueNumber,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return response.data as IssueReference[];
  }

  /**
   * Add a sub-issue to a parent issue.
   * POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues
   */
  async addSubIssue(params: AddSubIssueParams): Promise<AddDependencyResult> {
    await this.octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.parentIssueNumber,
        sub_issue_id: params.subIssueId,
        replace_parent: params.replaceParent ?? false,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return {
      success: true,
      message: `Issue ID ${params.subIssueId} is now a sub-issue of #${params.parentIssueNumber}`,
    };
  }

  /**
   * Remove a sub-issue from its parent.
   * DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue
   */
  async removeSubIssue(
    owner: string,
    repo: string,
    parentIssueNumber: number,
    subIssueId: number
  ): Promise<RemoveDependencyResult> {
    await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue",
      {
        owner,
        repo,
        issue_number: parentIssueNumber,
        sub_issue_id: subIssueId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    return {
      success: true,
      message: `Issue ID ${subIssueId} is no longer a sub-issue of #${parentIssueNumber}`,
    };
  }

  /**
   * Reprioritize a sub-issue within its parent.
   * PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority
   */
  async reprioritizeSubIssue(
    params: ReprioritizeSubIssueParams
  ): Promise<{ success: boolean; message: string }> {
    await this.octokit.request(
      "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority",
      {
        owner: params.owner,
        repo: params.repo,
        issue_number: params.parentIssueNumber,
        sub_issue_id: params.subIssueId,
        after_id: params.afterId,
        before_id: params.beforeId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const position = params.afterId
      ? `after issue ID ${params.afterId}`
      : `before issue ID ${params.beforeId}`;

    return {
      success: true,
      message: `Sub-issue ID ${params.subIssueId} moved ${position}`,
    };
  }
}
