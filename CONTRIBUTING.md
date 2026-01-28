# Contributing to GitHub Issue Relationships MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- GitHub CLI (`gh`) for testing

### Development Setup

1. Fork and clone the repository
2. Copy `.env.example` to `.env` and add your GitHub token
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```

## Development Workflow

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e      # End-to-end tests
npm run test:coverage # With coverage report
```

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build   # Compile TypeScript to dist/
npm start       # Run compiled production build
```

## Code Style

- TypeScript strict mode is enabled
- Format with Prettier (auto-runs on save in devcontainer)
- Use JSDoc comments for public APIs
- Follow existing patterns in the codebase

## Making Changes

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/). See [CLAUDE.md](CLAUDE.md) for full details.

```
feat(tools): add new tool for issue labels
fix(server): handle rate limiting gracefully
docs: update API reference with examples
test(e2e): add tests for pagination
```

### Pull Request Process

1. **Before submitting:**
   - Ensure all tests pass: `npm test`
   - Run type checking: `npm run typecheck`
   - Update documentation if adding/changing APIs

2. **PR title:** Follow the same format as commit messages

3. **PR description should include:**
   - Summary of changes
   - How to test the changes
   - Any breaking changes

4. **Keep PRs focused:** One feature or fix per PR

## Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Fast, isolated tests with mocks
├── integration/    # Tests with MCP transport, mocked GitHub API
├── e2e/            # Full stdio protocol tests
│   ├── helpers/    # Test utilities (spawn-server, mcp-client)
│   └── mocks/      # MSW handlers for GitHub API
└── fixtures/       # Shared test data
```

### Writing Tests

- Name test files as `*.test.ts`
- Use descriptive `describe` and `it` blocks
- Follow Arrange-Act-Assert pattern

```typescript
describe('GitHubClient', () => {
  describe('getBlockedBy', () => {
    it('should return empty array when no blockers exist', async () => {
      // Arrange
      const client = new GitHubClient('token');
      mockOctokit.request.mockResolvedValue({ data: [] });

      // Act
      const result = await client.getBlockedBy('owner', 'repo', 1);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
```

### Mocking

- **Unit tests:** Use Vitest's `vi.mock()` for module mocking
- **Integration tests:** Mock GitHubClient methods directly
- **E2E tests:** Use MSW (Mock Service Worker) for HTTP interception

## Adding New Tools

When adding a new MCP tool:

1. Add the tool registration in `src/server.ts`
2. Add any new GitHub API methods in `src/github/client.ts`
3. Add types in `src/github/types.ts` if needed
4. Add unit tests for the client method
5. Add integration tests for the tool
6. Add e2e tests for the full flow
7. Update `docs/api-reference.md`
8. Update `README.md` features list

## Questions?

If you have questions about contributing, feel free to open an issue for discussion.
