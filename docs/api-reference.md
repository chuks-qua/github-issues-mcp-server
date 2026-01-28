# API Reference

## Tools

All tools require `owner`, `repo`, and `issue_number` parameters to identify the issue.

### Issue Dependencies

#### github_get_blocked_by

Get the list of issues that are blocking a specific issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number

**Returns:** List of blocking issues with number, title, state, and URL.

---

#### github_get_blocking

Get the list of issues that a specific issue is blocking.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number

**Returns:** List of blocked issues.

---

#### github_add_blocking_dependency

Add a blocking dependency to an issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number to be blocked
- `blocking_issue_id` (number): **ID** (not number) of the blocking issue

**Note:** You need the issue ID, not the issue number. Get this from the GitHub API or issue page.

---

#### github_remove_blocking_dependency

Remove a blocking dependency from an issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number
- `blocking_issue_id` (number): ID of the blocking issue to remove

---

### Sub-Issues

#### github_get_parent_issue

Get the parent issue of a sub-issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Sub-issue number

**Returns:** Parent issue details or message if no parent exists.

---

#### github_list_sub_issues

List all sub-issues of a parent issue in priority order.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number

**Returns:** Ordered list of sub-issues.

---

#### github_add_sub_issue

Add a sub-issue to a parent issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number
- `sub_issue_id` (number): **ID** (not number) of the issue to add as sub-issue
- `replace_parent` (boolean, optional): If true, reassign from existing parent

---

#### github_remove_sub_issue

Remove a sub-issue from its parent.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number
- `sub_issue_id` (number): ID of the sub-issue to remove

---

#### github_reprioritize_sub_issue

Change the priority order of a sub-issue within its parent.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number
- `sub_issue_id` (number): ID of the sub-issue to reorder
- `after_id` (number, optional): Place after this sub-issue ID
- `before_id` (number, optional): Place before this sub-issue ID

**Note:** Specify exactly one of `after_id` or `before_id`.

---

## Response Examples

All tools support `response_format` parameter: `"markdown"` (default) or `"json"`.

### List Response (JSON format)

```json
{
  "blocked_by": [
    {
      "id": 123456789,
      "number": 42,
      "title": "Fix authentication flow",
      "state": "open",
      "html_url": "https://github.com/owner/repo/issues/42",
      "user": { "login": "octocat" },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "count": 1,
  "total": 1,
  "offset": 0,
  "has_more": false,
  "issue_number": 5
}
```

### Single Issue Response (JSON format)

```json
{
  "parent_issue": {
    "id": 987654321,
    "number": 10,
    "title": "Epic: User Authentication",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/10",
    "user": { "login": "octocat" },
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-01-25T16:20:00Z"
  },
  "issue_number": 15
}
```

### Write Operation Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Issue ID 123456789 is now a sub-issue of #50"
    }
  ]
}
```

---

## Error Codes Reference

| HTTP Code | Error | Description | Resolution |
|-----------|-------|-------------|------------|
| 400 | Bad Request | Invalid parameters | Check parameter types (issue_number must be number) |
| 401 | Unauthorized | Invalid or missing token | Verify GITHUB_TOKEN is set and valid |
| 403 | Forbidden | Insufficient permissions | Ensure token has `repo` scope |
| 403 | Rate Limited | API rate limit exceeded | Wait for reset or use authenticated requests |
| 404 | Not Found | Issue/repo doesn't exist | Verify owner, repo, and issue_number |
| 422 | Unprocessable Entity | Invalid operation | E.g., circular dependency, duplicate relationship |

---

## Rate Limiting

GitHub's REST API has the following limits:

| Type | Limit |
|------|-------|
| Authenticated requests | 5,000 requests/hour |
| GitHub Enterprise | Varies by instance |

The server does not implement automatic retry. If you hit rate limits:

1. Wait for the rate limit to reset (typically 1 hour)
2. Check `X-RateLimit-Remaining` header in API responses
3. Consider batching operations for high-volume usage

---

## Pagination

List operations support pagination:

- `limit` (1-100, default 20): Number of results per page
- `offset` (default 0): Number of results to skip

Response includes:
- `count`: Number of results in current page
- `total`: Total number of results
- `has_more`: Whether more results are available
- `next_offset`: Offset value for next page (if `has_more` is true)

---

## GitHub API References

- [Issue Dependencies API](https://docs.github.com/en/rest/issues/issue-dependencies)
- [Sub-Issues API](https://docs.github.com/en/rest/issues/sub-issues)
