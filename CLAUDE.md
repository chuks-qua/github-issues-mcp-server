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
├── tests/            # Test suites
│   ├── unit/         # Unit tests for individual modules
│   ├── integration/  # Integration tests with mocked transport
│   ├── e2e/          # End-to-end tests via stdio protocol
│   │   ├── helpers/  # Test utilities (spawn-server, mcp-client)
│   │   └── mocks/    # MSW handlers for GitHub API
│   └── fixtures/     # Shared test data
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

> **Important**: Do NOT add `Co-Authored-By` lines referencing Claude, Anthropic, or any AI assistant to commit messages.

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

## Test Conventions

### Test File Naming

| Test Type | Location | Naming |
|-----------|----------|--------|
| Unit tests | `tests/unit/` | `<module>.test.ts` |
| Integration tests | `tests/integration/` | `<feature>.test.ts` |
| E2E tests | `tests/e2e/` | `<scenario>.test.ts` |

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do X when Y', async () => {
      // Arrange - set up test data and mocks
      // Act - call the method under test
      // Assert - verify the results
    });
  });
});
```

### Mocking Strategies

| Test Type | Mocking Approach |
|-----------|------------------|
| Unit | `vi.mock()` for module mocking |
| Integration | Mock GitHubClient methods directly |
| E2E | MSW (Mock Service Worker) for HTTP interception |

### Running Tests

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration
npm run test:e2e
npm run test:coverage # With coverage report
```

## Pull Request Guidelines

### PR Title Format

Use the same format as commit messages:

```
feat(tools): add issue search tool
fix(server): handle edge case in pagination
```

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Changes
- Bullet points of specific changes

## Testing
- How to test these changes
- Which tests were added/modified

## Checklist
- [ ] Tests pass (`npm test`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes (or documented if any)
```

## Keeping This Document Alive

When you make changes to the project:

1. **Adding a new folder** → Add it to the Folder Structure section
2. **Removing a folder** → Remove it from the Folder Structure section
3. **New commit scope needed** → Add it to the Scopes table
4. **New convention established** → Document it here

This file is the source of truth for AI agents working on this codebase.
