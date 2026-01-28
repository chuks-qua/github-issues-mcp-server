# API Reference

## Tools

All tools require `owner`, `repo`, and `issue_number` parameters to identify the issue.

### Issue Dependencies

#### get_blocked_by

Get the list of issues that are blocking a specific issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number

**Returns:** List of blocking issues with number, title, state, and URL.

---

#### get_blocking

Get the list of issues that a specific issue is blocking.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number

**Returns:** List of blocked issues.

---

#### add_blocking_dependency

Add a blocking dependency to an issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number to be blocked
- `blocking_issue_id` (number): **ID** (not number) of the blocking issue

**Note:** You need the issue ID, not the issue number. Get this from the GitHub API or issue page.

---

#### remove_blocking_dependency

Remove a blocking dependency from an issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Issue number
- `blocking_issue_id` (number): ID of the blocking issue to remove

---

### Sub-Issues

#### get_parent_issue

Get the parent issue of a sub-issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Sub-issue number

**Returns:** Parent issue details or message if no parent exists.

---

#### list_sub_issues

List all sub-issues of a parent issue in priority order.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number

**Returns:** Ordered list of sub-issues.

---

#### add_sub_issue

Add a sub-issue to a parent issue.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number
- `sub_issue_id` (number): **ID** (not number) of the issue to add as sub-issue
- `replace_parent` (boolean, optional): If true, reassign from existing parent

---

#### remove_sub_issue

Remove a sub-issue from its parent.

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `issue_number` (number): Parent issue number
- `sub_issue_id` (number): ID of the sub-issue to remove

---

#### reprioritize_sub_issue

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

## GitHub API References

- [Issue Dependencies API](https://docs.github.com/en/rest/issues/issue-dependencies)
- [Sub-Issues API](https://docs.github.com/en/rest/issues/sub-issues)
