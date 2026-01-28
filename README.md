# GitHub Issue Relationships MCP Server

An MCP (Model Context Protocol) server that provides tools for managing GitHub issue relationships - tracking dependencies, blockers, and sub-issues.

## Features

### Issue Dependencies
- **github_get_blocked_by** - List issues blocking a specific issue
- **github_get_blocking** - List issues that an issue is blocking
- **github_add_blocking_dependency** - Add a blocking dependency
- **github_remove_blocking_dependency** - Remove a blocking dependency

### Sub-Issues
- **github_get_parent_issue** - Get the parent of a sub-issue
- **github_list_sub_issues** - List all sub-issues of a parent
- **github_add_sub_issue** - Add a sub-issue to a parent
- **github_remove_sub_issue** - Remove a sub-issue
- **github_reprioritize_sub_issue** - Change sub-issue priority order

## Setup

### Prerequisites

- Node.js 18+
- GitHub CLI (`gh`) authenticated, OR a GitHub Personal Access Token

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd git-relationship-mcp

# Install dependencies
npm install

# Build (optional, for production)
npm run build
```

### Authentication

The server requires a GitHub token with `repo` scope. You have two options:

**Option 1: Use GitHub CLI (Recommended)**

If you're authenticated with `gh`, the Claude Desktop config can retrieve the token automatically.

**Option 2: Environment Variable**

Set `GITHUB_TOKEN` directly:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## Claude Desktop Configuration

Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Using GitHub CLI authentication (Windows):

```json
{
  "mcpServers": {
    "github-issues": {
      "command": "cmd",
      "args": ["/c", "for /f %i in ('gh auth token') do @set GITHUB_TOKEN=%i && npx tsx src/index.ts"],
      "cwd": "C:\\path\\to\\git-relationship-mcp"
    }
  }
}
```

### Using direct token:

```json
{
  "mcpServers": {
    "github-issues": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "C:\\path\\to\\git-relationship-mcp",
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Development

```bash
# Run in development mode
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Run production build
npm start
```

## Verifying Installation

After configuring Claude Desktop, test the server by asking Claude:

> "List the tools from the github-issues server"

Claude should respond with 9 tools (github_get_blocked_by, github_get_blocking, github_add_blocking_dependency, etc.).

### Manual Verification

Test the server starts correctly:

```bash
# Using GitHub CLI
GITHUB_TOKEN=$(gh auth token) npx tsx src/index.ts

# Using direct token
GITHUB_TOKEN=ghp_your_token npx tsx src/index.ts
```

The server should output startup information. Press `Ctrl+C` to exit.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "GITHUB_TOKEN environment variable is required" | Token not set or `gh` not authenticated | Run `gh auth login` or set `GITHUB_TOKEN` directly |
| "Repository not found" (404) | Token lacks `repo` scope or repo doesn't exist | Ensure token has `repo` scope; verify owner/repo spelling |
| "Rate limit exceeded" (403) | GitHub API limit hit | Wait 1 hour or use a PAT with higher limits |
| Server doesn't appear in Claude Desktop | Config file syntax error | Validate JSON syntax; check file location |
| "Permission denied" on write operations | Token lacks write permissions | Regenerate token with `repo` scope |
| "Issue not found" for existing issue | Using issue number instead of ID for write ops | Use issue ID (from API or URL) for `*_id` parameters |

## Example Usage

Once configured in Claude Desktop, you can ask Claude:

- "What issues are blocking issue #42 in owner/repo?"
- "List the sub-issues of issue #10 in my-org/project"
- "Add issue #5 as a sub-issue of #1 in my-repo"
- "Show me what issues #15 is blocking"

## API Reference

See [GitHub Issue Dependencies API](https://docs.github.com/en/rest/issues/issue-dependencies) and [GitHub Sub-Issues API](https://docs.github.com/en/rest/issues/sub-issues) for full API documentation.

## License

MIT
