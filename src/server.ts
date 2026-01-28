/**
 * MCP Server for GitHub Issue Relationships.
 *
 * Exposes tools for managing issue dependencies and sub-issues.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./github/client.js";
import { loadConfig } from "./config.js";

/**
 * Create and configure the MCP server.
 */
export function createServer(): McpServer {
  // Load configuration
  const config = loadConfig();

  // Initialize GitHub client
  const githubClient = new GitHubClient(config.githubToken);

  // Create MCP server
  const server = new McpServer({
    name: "github-issues-mcp",
    version: "1.0.0",
  });

  // Common schema shape for issue identifiers
  const issueIdentifierShape = {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number"),
  };

  // ==================== Dependency Tools ====================

  server.tool(
    "get_blocked_by",
    "Get the list of issues that are blocking a specific issue. These are issues that must be resolved before this issue can proceed.",
    issueIdentifierShape,
    async (params) => {
      const issues = await githubClient.getBlockedBy(
        params.owner,
        params.repo,
        params.issue_number
      );

      if (issues.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${params.issue_number} in ${params.owner}/${params.repo} is not blocked by any issues.`,
            },
          ],
        };
      }

      const issueList = issues
        .map(
          (issue) =>
            `- #${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Issue #${params.issue_number} is blocked by ${issues.length} issue(s):\n\n${issueList}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_blocking",
    "Get the list of issues that a specific issue is blocking. These are issues waiting for this issue to be resolved.",
    issueIdentifierShape,
    async (params) => {
      const issues = await githubClient.getBlocking(
        params.owner,
        params.repo,
        params.issue_number
      );

      if (issues.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${params.issue_number} in ${params.owner}/${params.repo} is not blocking any issues.`,
            },
          ],
        };
      }

      const issueList = issues
        .map(
          (issue) =>
            `- #${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Issue #${params.issue_number} is blocking ${issues.length} issue(s):\n\n${issueList}`,
          },
        ],
      };
    }
  );

  server.tool(
    "add_blocking_dependency",
    "Add a blocking dependency to an issue. This marks that the specified issue is blocked by another issue.",
    {
      ...issueIdentifierShape,
      blocking_issue_id: z
        .number()
        .int()
        .positive()
        .describe("The ID (not number) of the issue that blocks this issue"),
    },
    async (params) => {
      const result = await githubClient.addBlockingDependency(
        params.owner,
        params.repo,
        params.issue_number,
        params.blocking_issue_id
      );

      return {
        content: [
          {
            type: "text" as const,
            text: result.message,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_blocking_dependency",
    "Remove a blocking dependency from an issue. This removes the 'blocked by' relationship between two issues.",
    {
      ...issueIdentifierShape,
      blocking_issue_id: z
        .number()
        .int()
        .positive()
        .describe("The ID of the blocking issue to remove"),
    },
    async (params) => {
      const result = await githubClient.removeBlockingDependency(
        params.owner,
        params.repo,
        params.issue_number,
        params.blocking_issue_id
      );

      return {
        content: [
          {
            type: "text" as const,
            text: result.message,
          },
        ],
      };
    }
  );

  // ==================== Sub-Issue Tools ====================

  server.tool(
    "get_parent_issue",
    "Get the parent issue of a sub-issue. Returns the parent issue details if one exists, or indicates no parent.",
    issueIdentifierShape,
    async (params) => {
      const parent = await githubClient.getParentIssue(
        params.owner,
        params.repo,
        params.issue_number
      );

      if (!parent) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${params.issue_number} in ${params.owner}/${params.repo} has no parent issue.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Issue #${params.issue_number} is a sub-issue of:\n\n` +
              `- #${parent.number}: ${parent.title} (${parent.state})\n` +
              `  URL: ${parent.html_url}`,
          },
        ],
      };
    }
  );

  server.tool(
    "list_sub_issues",
    "List all sub-issues of a parent issue. Returns the child issues in their priority order.",
    issueIdentifierShape,
    async (params) => {
      const subIssues = await githubClient.listSubIssues(
        params.owner,
        params.repo,
        params.issue_number
      );

      if (subIssues.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Issue #${params.issue_number} in ${params.owner}/${params.repo} has no sub-issues.`,
            },
          ],
        };
      }

      const issueList = subIssues
        .map(
          (issue, index) =>
            `${index + 1}. #${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Issue #${params.issue_number} has ${subIssues.length} sub-issue(s):\n\n${issueList}`,
          },
        ],
      };
    }
  );

  server.tool(
    "add_sub_issue",
    "Add a sub-issue to a parent issue. Use replace_parent=true to move a sub-issue from an existing parent.",
    {
      ...issueIdentifierShape,
      sub_issue_id: z
        .number()
        .int()
        .positive()
        .describe("The ID (not number) of the issue to add as a sub-issue"),
      replace_parent: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, reassign from existing parent"),
    },
    async (params) => {
      const result = await githubClient.addSubIssue({
        owner: params.owner,
        repo: params.repo,
        parentIssueNumber: params.issue_number,
        subIssueId: params.sub_issue_id,
        replaceParent: params.replace_parent,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: result.message,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_sub_issue",
    "Remove a sub-issue from its parent. The sub-issue becomes a standalone issue.",
    {
      ...issueIdentifierShape,
      sub_issue_id: z
        .number()
        .int()
        .positive()
        .describe("The ID of the sub-issue to remove"),
    },
    async (params) => {
      const result = await githubClient.removeSubIssue(
        params.owner,
        params.repo,
        params.issue_number,
        params.sub_issue_id
      );

      return {
        content: [
          {
            type: "text" as const,
            text: result.message,
          },
        ],
      };
    }
  );

  server.tool(
    "reprioritize_sub_issue",
    "Change the priority order of a sub-issue within its parent. Specify either after_id OR before_id to position the sub-issue.",
    {
      ...issueIdentifierShape,
      sub_issue_id: z
        .number()
        .int()
        .positive()
        .describe("The ID of the sub-issue to reorder"),
      after_id: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Place after this sub-issue ID"),
      before_id: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Place before this sub-issue ID"),
    },
    async (params) => {
      if (params.after_id === undefined && params.before_id === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Must specify either after_id or before_id",
            },
          ],
          isError: true,
        };
      }

      if (params.after_id !== undefined && params.before_id !== undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Specify only one of after_id or before_id, not both",
            },
          ],
          isError: true,
        };
      }

      const result = await githubClient.reprioritizeSubIssue({
        owner: params.owner,
        repo: params.repo,
        parentIssueNumber: params.issue_number,
        subIssueId: params.sub_issue_id,
        afterId: params.after_id,
        beforeId: params.before_id,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: result.message,
          },
        ],
      };
    }
  );

  return server;
}
