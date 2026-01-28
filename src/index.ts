#!/usr/bin/env node

/**
 * GitHub Issue Relationships MCP Server
 *
 * Entry point for the MCP server that provides tools for managing
 * GitHub issue dependencies and sub-issues.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr since stdout is used for MCP communication
  console.error("GitHub Issue Relationships MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
