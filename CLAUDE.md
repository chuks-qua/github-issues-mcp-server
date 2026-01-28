# CLAUDE.md

> **Living Document**: This file must stay in sync with the codebase. Update it when adding/removing directories or changing project conventions.

## Project Overview

MCP (Model Context Protocol) server for managing GitHub issue relationships - tracking dependencies, blockers, and links between issues.

## Folder Structure

```
git-relationship-mcp/
├── .devcontainer/    # Docker and devcontainer config for local/cloud dev
│   ├── devcontainer.json
│   └── Dockerfile
├── src/              # TypeScript source code for the MCP server
│   ├── index.ts      # Entry point
│   ├── server.ts     # MCP server with tool definitions
│   ├── config.ts     # Configuration management
│   └── github/       # GitHub API client
│       ├── client.ts
│       └── types.ts
└── docs/             # Documentation, architecture decisions, API references
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `chore` | Maintenance tasks (deps, config, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `ci` | CI/CD configuration changes |
| `style` | Code style changes (formatting, whitespace) |

### Scopes

| Scope | When to use |
|-------|-------------|
| `server` | MCP server core logic |
| `tools` | MCP tool definitions and handlers |
| `docker` | Devcontainer or Docker changes |
| `deps` | Dependency updates |

### Examples

```
feat(tools): add get_issue_relationships tool
fix(server): handle rate limiting from GitHub API
docs: update README with setup instructions
chore(deps): bump @modelcontextprotocol/sdk to 1.2.0
```

## Keeping This Document Alive

When you make changes to the project:

1. **Adding a new folder** → Add it to the Folder Structure section
2. **Removing a folder** → Remove it from the Folder Structure section
3. **New commit scope needed** → Add it to the Scopes table
4. **New convention established** → Document it here

This file is the source of truth for AI agents working on this codebase.
