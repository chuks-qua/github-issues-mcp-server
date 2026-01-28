# Architecture Overview

This document describes the architecture and design decisions for the GitHub Issue Relationships MCP Server.

## System Design

```
┌─────────────────┐     stdio      ┌──────────────┐    HTTPS     ┌─────────────┐
│  Claude Desktop │ ◄────────────► │  MCP Server  │ ◄──────────► │  GitHub API │
│  (MCP Client)   │   JSON-RPC     │              │   REST       │             │
└─────────────────┘                └──────────────┘              └─────────────┘
```

The server acts as a bridge between Claude Desktop and the GitHub API, exposing GitHub's Issue Dependencies and Sub-Issues APIs as MCP tools.

## Component Responsibilities

### src/index.ts - Entry Point

- Creates and connects the MCP server to stdio transport
- Initializes GitHubClient with authentication token
- Handles fatal errors and process exit

### src/server.ts - MCP Server

- Registers all 9 MCP tools with schemas and handlers
- Implements input validation using Zod
- Formats responses in markdown or JSON
- Handles pagination for list operations
- Enforces character limits (25K) to prevent context overflow

### src/github/client.ts - GitHub API Client

- Thin wrapper around Octokit REST client
- Handles GitHub API versioning headers
- Transforms API responses to internal types
- Normalizes error handling (e.g., 404 → null for parent lookup)

### src/config.ts - Configuration

- Loads GITHUB_TOKEN from environment
- Validates required configuration
- Provides clear error messages for missing config

## Design Decisions

### ADR-001: Issue IDs vs Issue Numbers

**Context:** GitHub APIs use both issue IDs (globally unique) and issue numbers (unique per repository).

**Decision:**
- Use issue numbers for identifying the target issue (human-friendly)
- Require issue IDs for `*_id` parameters in write operations (as GitHub API mandates)

**Consequence:** Users must obtain issue IDs from the GitHub API or issue URL for write operations. The tools clearly document this distinction.

### ADR-002: Dual Response Formats

**Context:** Claude can process both human-readable markdown and structured JSON.

**Decision:** Support both via `response_format` parameter, defaulting to markdown.

**Rationale:**
- Markdown is more readable in chat conversations
- JSON enables structured processing and chaining of operations

### ADR-003: Server-Side Pagination

**Context:** GitHub API can return large result sets that might exceed context limits.

**Decision:** Implement offset/limit pagination with:
- Default limit: 20 items
- Maximum limit: 100 items
- Character safety limit: 25,000 characters

**Consequence:** Consistent pagination across all list tools. Responses include `has_more` and `next_offset` for easy continuation.

### ADR-004: Stdio Transport

**Context:** MCP supports multiple transport mechanisms.

**Decision:** Use stdio transport exclusively.

**Rationale:**
- Standard for Claude Desktop integration
- Simple process management
- No network configuration required

### ADR-005: Tool Naming Convention

**Context:** MCP tools need clear, unambiguous names.

**Decision:** Prefix all tools with `github_` (e.g., `github_get_blocked_by`).

**Rationale:**
- Avoids conflicts with tools from other MCP servers
- Makes the tool's domain obvious
- Consistent with other GitHub-related MCP servers

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 18+ | MCP SDK requirement |
| Language | TypeScript | Type safety, better tooling, IDE support |
| MCP SDK | @modelcontextprotocol/sdk | Official MCP implementation |
| GitHub Client | @octokit/rest | Official GitHub SDK with TypeScript types |
| Validation | Zod | Runtime type validation, automatic schema generation |
| Testing | Vitest | Fast, TypeScript-native, good mocking support |
| API Mocking | MSW | HTTP-level mocking for realistic e2e tests |

## Error Handling Strategy

1. **Validation Errors:** Caught by Zod schemas, returned as clear error messages
2. **GitHub API Errors:** Passed through with HTTP status and message
3. **Configuration Errors:** Fail fast at startup with actionable messages
4. **Unexpected Errors:** Logged and returned as generic error responses

## Security Considerations

- GitHub token is required but never logged or exposed in responses
- No file system access beyond configuration
- No network access except to GitHub API (or configured enterprise URL)
- All input validated before processing
