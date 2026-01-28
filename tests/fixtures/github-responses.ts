/**
 * Mock GitHub API response data for testing.
 */

import type { IssueReference } from '../../src/github/types.js';

export const mockIssue: IssueReference = {
  id: 123456789,
  number: 42,
  title: 'Test Issue',
  state: 'open',
  html_url: 'https://github.com/testowner/testrepo/issues/42',
  user: { login: 'testuser' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

export const mockBlockingIssues: IssueReference[] = [
  {
    ...mockIssue,
    id: 100000001,
    number: 10,
    title: 'Blocker Issue 1',
    html_url: 'https://github.com/testowner/testrepo/issues/10',
  },
  {
    ...mockIssue,
    id: 100000002,
    number: 20,
    title: 'Blocker Issue 2',
    state: 'closed',
    html_url: 'https://github.com/testowner/testrepo/issues/20',
  },
];

export const mockSubIssues: IssueReference[] = [
  {
    ...mockIssue,
    id: 200000001,
    number: 101,
    title: 'Sub-issue 1',
    html_url: 'https://github.com/testowner/testrepo/issues/101',
  },
  {
    ...mockIssue,
    id: 200000002,
    number: 102,
    title: 'Sub-issue 2',
    html_url: 'https://github.com/testowner/testrepo/issues/102',
  },
  {
    ...mockIssue,
    id: 200000003,
    number: 103,
    title: 'Sub-issue 3',
    state: 'closed',
    html_url: 'https://github.com/testowner/testrepo/issues/103',
  },
];

export const mockParentIssue: IssueReference = {
  ...mockIssue,
  id: 300000001,
  number: 50,
  title: 'Parent Issue',
  html_url: 'https://github.com/testowner/testrepo/issues/50',
};
