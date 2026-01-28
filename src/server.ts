/**
 * MCP Server for GitHub Issue Relationships.
 *
 * Exposes tools for managing issue dependencies and sub-issues.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./github/client.js";
import { loadConfig } from "./config.js";
import type { IssueReference } from "./github/types.js";

// Constants
const CHARACTER_LIMIT = 25000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Response format enum
const ResponseFormat = z.enum(["markdown", "json"]);
type ResponseFormatType = z.infer<typeof ResponseFormat>;

// Common annotations
const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const DELETE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

const REPRIORITIZE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

// Helper functions for formatting
function formatIssueAsMarkdown(issue: IssueReference): string {
  return `- #${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`;
}

function formatIssueListAsMarkdown(issues: IssueReference[], numbered = false): string {
  return issues
    .map((issue, index) =>
      numbered
        ? `${index + 1}. #${issue.number}: ${issue.title} (${issue.state}) - ${issue.html_url}`
        : formatIssueAsMarkdown(issue)
    )
    .join("\n");
}

function formatResponse<T>(
  data: T,
  format: ResponseFormatType,
  markdownFormatter: (data: T) => string
): { text: string; structuredContent: T } {
  const text = format === "json"
    ? JSON.stringify(data, null, 2)
    : markdownFormatter(data);

  // Check character limit
  const finalText = text.length > CHARACTER_LIMIT
    ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated due to size limit]"
    : text;

  return { text: finalText, structuredContent: data };
}

function applyPagination<T>(items: T[], offset: number, limit: number): {
  items: T[];
  total: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
} {
  const total = items.length;
  const paginated = items.slice(offset, offset + limit);
  const has_more = offset + paginated.length < total;

  return {
    items: paginated,
    total,
    count: paginated.length,
    offset,
    has_more,
    ...(has_more ? { next_offset: offset + paginated.length } : {}),
  };
}

/**
 * Create and configure the MCP server.
 */
export function createServer(): McpServer {
  // Load configuration
  const config = loadConfig();

  // Initialize GitHub client
  const githubClient = new GitHubClient(
    config.githubToken,
    config.githubApiBaseUrl
  );

  // Create MCP server
  const server = new McpServer({
    name: "github-issues-mcp-server",
    version: "1.0.0",
  });

  // ==================== Dependency Tools ====================

  // Schema for get_blocked_by and get_blocking
  const GetDependenciesInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number"),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
      .describe("Maximum number of results to return (1-100)"),
    offset: z.number().int().min(0).default(0)
      .describe("Number of results to skip for pagination"),
    response_format: ResponseFormat.default("markdown")
      .describe("Output format: 'markdown' for human-readable or 'json' for structured data"),
  });

  server.registerTool(
    "github_get_blocked_by",
    {
      title: "Get Blocking Issues",
      description: `Get issues that are blocking a specific issue.

Retrieves all issues that must be resolved before the specified issue can proceed.
Uses GitHub's issue dependencies API.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The issue number to check
  - limit (number): Maximum results to return, 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "blocked_by": [{ "id": number, "number": number, "title": string, "state": "open"|"closed", "html_url": string }],
    "count": number,
    "total": number,
    "offset": number,
    "has_more": boolean,
    "next_offset": number (if has_more),
    "issue_number": number
  }

  For Markdown format: A formatted list of blocking issues with links.

Examples:
  - "What's blocking issue #42?" → github_get_blocked_by(owner="org", repo="project", issue_number=42)
  - "Show blockers for the auth bug" → First find issue number, then call this tool

Error Handling:
  - Returns "Issue not found" for invalid issue numbers (404)
  - Returns "Repository not found" for invalid owner/repo
  - Returns "Rate limit exceeded" if GitHub API limits hit`,
      inputSchema: GetDependenciesInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (params) => {
      const allIssues = await githubClient.getBlockedBy(
        params.owner,
        params.repo,
        params.issue_number
      );

      const { items: issues, ...pagination } = applyPagination(
        allIssues,
        params.offset,
        params.limit
      );

      const output = {
        blocked_by: issues,
        ...pagination,
        issue_number: params.issue_number,
      };

      if (allIssues.length === 0) {
        const text = `Issue #${params.issue_number} in ${params.owner}/${params.repo} is not blocked by any issues.`;
        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      }

      const { text, structuredContent } = formatResponse(
        output,
        params.response_format,
        (data) => {
          const header = `# Blocking Issues for #${params.issue_number}\n\n`;
          const summary = `Found ${data.total} blocking issue(s)${data.has_more ? ` (showing ${data.count})` : ""}:\n\n`;
          const list = formatIssueListAsMarkdown(data.blocked_by);
          const pagination = data.has_more ? `\n\n*More results available. Use offset=${data.next_offset} to see next page.*` : "";
          return header + summary + list + pagination;
        }
      );

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }
  );

  server.registerTool(
    "github_get_blocking",
    {
      title: "Get Blocked Issues",
      description: `Get issues that a specific issue is blocking.

Retrieves all issues that are waiting for the specified issue to be resolved.
Uses GitHub's issue dependencies API.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The issue number to check
  - limit (number): Maximum results to return, 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "blocking": [{ "id": number, "number": number, "title": string, "state": "open"|"closed", "html_url": string }],
    "count": number,
    "total": number,
    "offset": number,
    "has_more": boolean,
    "next_offset": number (if has_more),
    "issue_number": number
  }

  For Markdown format: A formatted list of blocked issues with links.

Examples:
  - "What issues depend on #42?" → github_get_blocking(owner="org", repo="project", issue_number=42)
  - "What's waiting on this fix?" → Call with the issue number

Error Handling:
  - Returns "Issue not found" for invalid issue numbers (404)
  - Returns "Repository not found" for invalid owner/repo
  - Returns "Rate limit exceeded" if GitHub API limits hit`,
      inputSchema: GetDependenciesInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (params) => {
      const allIssues = await githubClient.getBlocking(
        params.owner,
        params.repo,
        params.issue_number
      );

      const { items: issues, ...pagination } = applyPagination(
        allIssues,
        params.offset,
        params.limit
      );

      const output = {
        blocking: issues,
        ...pagination,
        issue_number: params.issue_number,
      };

      if (allIssues.length === 0) {
        const text = `Issue #${params.issue_number} in ${params.owner}/${params.repo} is not blocking any issues.`;
        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      }

      const { text, structuredContent } = formatResponse(
        output,
        params.response_format,
        (data) => {
          const header = `# Issues Blocked by #${params.issue_number}\n\n`;
          const summary = `Blocking ${data.total} issue(s)${data.has_more ? ` (showing ${data.count})` : ""}:\n\n`;
          const list = formatIssueListAsMarkdown(data.blocking);
          const pagination = data.has_more ? `\n\n*More results available. Use offset=${data.next_offset} to see next page.*` : "";
          return header + summary + list + pagination;
        }
      );

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }
  );

  // Schema for add/remove dependency
  const DependencyModifyInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number"),
    blocking_issue_id: z.number().int().positive()
      .describe("The ID (not number) of the issue that blocks this issue"),
  });

  server.registerTool(
    "github_add_blocking_dependency",
    {
      title: "Add Blocking Dependency",
      description: `Add a blocking dependency to an issue.

Marks that the specified issue is blocked by another issue. The blocking issue
must be resolved before the blocked issue can proceed.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The issue number to mark as blocked
  - blocking_issue_id (number): The ID (not number) of the blocking issue

Returns:
  Success message confirming the dependency was added.

Examples:
  - "Issue #5 is blocked by issue ID 12345" → github_add_blocking_dependency(owner="org", repo="project", issue_number=5, blocking_issue_id=12345)

Error Handling:
  - Returns error if issue doesn't exist (404)
  - Returns error if dependency already exists (422)
  - Returns "Permission denied" if token lacks write access (403)`,
      inputSchema: DependencyModifyInputSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (params) => {
      const result = await githubClient.addBlockingDependency(
        params.owner,
        params.repo,
        params.issue_number,
        params.blocking_issue_id
      );

      return {
        content: [{ type: "text" as const, text: result.message }],
      };
    }
  );

  server.registerTool(
    "github_remove_blocking_dependency",
    {
      title: "Remove Blocking Dependency",
      description: `Remove a blocking dependency from an issue.

Removes the 'blocked by' relationship between two issues. The previously
blocked issue will no longer wait for the blocking issue.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The issue number to unblock
  - blocking_issue_id (number): The ID of the blocking issue to remove

Returns:
  Success message confirming the dependency was removed.

Examples:
  - "Remove blocker issue ID 12345 from #5" → github_remove_blocking_dependency(owner="org", repo="project", issue_number=5, blocking_issue_id=12345)

Error Handling:
  - Returns error if issue doesn't exist (404)
  - Returns error if dependency doesn't exist (404)
  - Returns "Permission denied" if token lacks write access (403)`,
      inputSchema: DependencyModifyInputSchema,
      annotations: DELETE_ANNOTATIONS,
    },
    async (params) => {
      const result = await githubClient.removeBlockingDependency(
        params.owner,
        params.repo,
        params.issue_number,
        params.blocking_issue_id
      );

      return {
        content: [{ type: "text" as const, text: result.message }],
      };
    }
  );

  // ==================== Sub-Issue Tools ====================

  // Schema for get_parent_issue
  const GetParentInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Issue number"),
    response_format: ResponseFormat.default("markdown")
      .describe("Output format: 'markdown' for human-readable or 'json' for structured data"),
  });

  server.registerTool(
    "github_get_parent_issue",
    {
      title: "Get Parent Issue",
      description: `Get the parent issue of a sub-issue.

Returns the parent issue details if the specified issue is a sub-issue,
or indicates that no parent exists.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The sub-issue number to check
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "parent": { "id": number, "number": number, "title": string, "state": "open"|"closed", "html_url": string } | null,
    "issue_number": number,
    "has_parent": boolean
  }

  For Markdown format: Parent issue details or "no parent" message.

Examples:
  - "What's the parent of issue #101?" → github_get_parent_issue(owner="org", repo="project", issue_number=101)
  - "Is this a sub-issue?" → Call to check if parent exists

Error Handling:
  - Returns "Issue not found" for invalid issue numbers (404)
  - Returns null parent if issue has no parent`,
      inputSchema: GetParentInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (params) => {
      const parent = await githubClient.getParentIssue(
        params.owner,
        params.repo,
        params.issue_number
      );

      const output = {
        parent,
        issue_number: params.issue_number,
        has_parent: parent !== null,
      };

      if (!parent) {
        const text = `Issue #${params.issue_number} in ${params.owner}/${params.repo} has no parent issue.`;
        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      }

      const { text, structuredContent } = formatResponse(
        output,
        params.response_format,
        (data) => {
          const p = data.parent!;
          return `# Parent of Issue #${params.issue_number}\n\n` +
            `Issue #${params.issue_number} is a sub-issue of:\n\n` +
            `- #${p.number}: ${p.title} (${p.state})\n` +
            `  URL: ${p.html_url}`;
        }
      );

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }
  );

  // Schema for list_sub_issues
  const ListSubIssuesInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Parent issue number"),
    limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE)
      .describe("Maximum number of results to return (1-100)"),
    offset: z.number().int().min(0).default(0)
      .describe("Number of results to skip for pagination"),
    response_format: ResponseFormat.default("markdown")
      .describe("Output format: 'markdown' for human-readable or 'json' for structured data"),
  });

  server.registerTool(
    "github_list_sub_issues",
    {
      title: "List Sub Issues",
      description: `List all sub-issues of a parent issue.

Returns the child issues in their priority order. Sub-issues are smaller
tasks that make up a larger parent issue.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The parent issue number
  - limit (number): Maximum results to return, 1-100 (default: 20)
  - offset (number): Number of results to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "sub_issues": [{ "id": number, "number": number, "title": string, "state": "open"|"closed", "html_url": string }],
    "count": number,
    "total": number,
    "offset": number,
    "has_more": boolean,
    "next_offset": number (if has_more),
    "parent_issue_number": number
  }

  For Markdown format: A numbered list of sub-issues in priority order.

Examples:
  - "List tasks under epic #50" → github_list_sub_issues(owner="org", repo="project", issue_number=50)
  - "What sub-issues does this have?" → Call with the parent issue number

Error Handling:
  - Returns "Issue not found" for invalid issue numbers (404)
  - Returns empty list if no sub-issues exist`,
      inputSchema: ListSubIssuesInputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async (params) => {
      const allSubIssues = await githubClient.listSubIssues(
        params.owner,
        params.repo,
        params.issue_number
      );

      const { items: subIssues, ...pagination } = applyPagination(
        allSubIssues,
        params.offset,
        params.limit
      );

      const output = {
        sub_issues: subIssues,
        ...pagination,
        parent_issue_number: params.issue_number,
      };

      if (allSubIssues.length === 0) {
        const text = `Issue #${params.issue_number} in ${params.owner}/${params.repo} has no sub-issues.`;
        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      }

      const { text, structuredContent } = formatResponse(
        output,
        params.response_format,
        (data) => {
          const header = `# Sub-Issues of #${params.issue_number}\n\n`;
          const summary = `${data.total} sub-issue(s)${data.has_more ? ` (showing ${data.count})` : ""} in priority order:\n\n`;
          const list = formatIssueListAsMarkdown(data.sub_issues, true);
          const pagination = data.has_more ? `\n\n*More results available. Use offset=${data.next_offset} to see next page.*` : "";
          return header + summary + list + pagination;
        }
      );

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }
  );

  // Schema for add_sub_issue
  const AddSubIssueInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Parent issue number"),
    sub_issue_id: z.number().int().positive()
      .describe("The ID (not number) of the issue to add as a sub-issue"),
    replace_parent: z.boolean().default(false)
      .describe("If true, reassign from existing parent. If false and issue has a parent, operation fails."),
  });

  server.registerTool(
    "github_add_sub_issue",
    {
      title: "Add Sub Issue",
      description: `Add a sub-issue to a parent issue.

Makes an existing issue a child of the specified parent issue.
Use replace_parent=true to move a sub-issue from an existing parent.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The parent issue number
  - sub_issue_id (number): The ID (not number) of the issue to add as sub-issue
  - replace_parent (boolean): If true, reassign from existing parent (default: false)

Returns:
  Success message confirming the sub-issue was added.

Examples:
  - "Add issue ID 12345 as sub-issue of #50" → github_add_sub_issue(owner="org", repo="project", issue_number=50, sub_issue_id=12345)
  - "Move sub-issue to new parent" → Set replace_parent=true

Error Handling:
  - Returns error if issue doesn't exist (404)
  - Returns error if issue already has parent and replace_parent=false (422)
  - Returns "Permission denied" if token lacks write access (403)`,
      inputSchema: AddSubIssueInputSchema,
      annotations: WRITE_ANNOTATIONS,
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
        content: [{ type: "text" as const, text: result.message }],
      };
    }
  );

  // Schema for remove_sub_issue
  const RemoveSubIssueInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Parent issue number"),
    sub_issue_id: z.number().int().positive()
      .describe("The ID of the sub-issue to remove"),
  });

  server.registerTool(
    "github_remove_sub_issue",
    {
      title: "Remove Sub Issue",
      description: `Remove a sub-issue from its parent.

The sub-issue becomes a standalone issue, no longer associated with the parent.

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The parent issue number
  - sub_issue_id (number): The ID of the sub-issue to remove

Returns:
  Success message confirming the sub-issue was removed.

Examples:
  - "Remove issue ID 12345 from parent #50" → github_remove_sub_issue(owner="org", repo="project", issue_number=50, sub_issue_id=12345)

Error Handling:
  - Returns error if parent issue doesn't exist (404)
  - Returns error if sub-issue isn't a child of this parent (404)
  - Returns "Permission denied" if token lacks write access (403)`,
      inputSchema: RemoveSubIssueInputSchema,
      annotations: DELETE_ANNOTATIONS,
    },
    async (params) => {
      const result = await githubClient.removeSubIssue(
        params.owner,
        params.repo,
        params.issue_number,
        params.sub_issue_id
      );

      return {
        content: [{ type: "text" as const, text: result.message }],
      };
    }
  );

  // Schema for reprioritize_sub_issue
  const ReprioritizeSubIssueInputSchema = z.object({
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().int().positive().describe("Parent issue number"),
    sub_issue_id: z.number().int().positive()
      .describe("The ID of the sub-issue to reorder"),
    after_id: z.number().int().positive().optional()
      .describe("Place the sub-issue after this sub-issue ID"),
    before_id: z.number().int().positive().optional()
      .describe("Place the sub-issue before this sub-issue ID"),
  });

  server.registerTool(
    "github_reprioritize_sub_issue",
    {
      title: "Reprioritize Sub Issue",
      description: `Change the priority order of a sub-issue within its parent.

Repositions a sub-issue relative to another sub-issue in the list.
Specify either after_id OR before_id (not both).

Args:
  - owner (string): Repository owner (user or organization)
  - repo (string): Repository name
  - issue_number (number): The parent issue number
  - sub_issue_id (number): The ID of the sub-issue to move
  - after_id (number, optional): Place after this sub-issue ID
  - before_id (number, optional): Place before this sub-issue ID

Returns:
  Success message confirming the reorder.

Examples:
  - "Move task after ID 12345" → github_reprioritize_sub_issue(..., after_id=12345)
  - "Move task to top" → Use before_id with the first sub-issue ID

Error Handling:
  - Returns error if neither after_id nor before_id is specified
  - Returns error if both after_id and before_id are specified
  - Returns error if referenced sub-issue doesn't exist (404)
  - Returns "Permission denied" if token lacks write access (403)`,
      inputSchema: ReprioritizeSubIssueInputSchema,
      annotations: REPRIORITIZE_ANNOTATIONS,
    },
    async (params) => {
      if (params.after_id === undefined && params.before_id === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Must specify either after_id or before_id to position the sub-issue.",
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
              text: "Error: Specify only one of after_id or before_id, not both.",
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
        content: [{ type: "text" as const, text: result.message }],
      };
    }
  );

  return server;
}
