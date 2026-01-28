/**
 * TypeScript types for GitHub Issue Relationships API responses.
 */

/**
 * Minimal issue representation returned by dependencies/sub-issues endpoints.
 */
export interface IssueReference {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  user: {
    login: string;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for identifying an issue.
 */
export interface IssueIdentifier {
  owner: string;
  repo: string;
  issueNumber: number;
}

/**
 * Result of adding a blocking dependency.
 */
export interface AddDependencyResult {
  success: boolean;
  message: string;
}

/**
 * Result of removing a dependency.
 */
export interface RemoveDependencyResult {
  success: boolean;
  message: string;
}

/**
 * Parameters for adding a sub-issue.
 */
export interface AddSubIssueParams {
  owner: string;
  repo: string;
  parentIssueNumber: number;
  subIssueId: number;
  replaceParent?: boolean;
}

/**
 * Parameters for reprioritizing a sub-issue.
 */
export interface ReprioritizeSubIssueParams {
  owner: string;
  repo: string;
  parentIssueNumber: number;
  subIssueId: number;
  afterId?: number;
  beforeId?: number;
}
