/**
 * Configuration management for the MCP server.
 */

export interface Config {
  githubToken: string;
}

/**
 * Load configuration from environment variables.
 * The GITHUB_TOKEN is expected to be set by the caller (e.g., Claude Desktop config).
 */
export function loadConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required. " +
        "Set it directly or use: gh auth token"
    );
  }

  return {
    githubToken,
  };
}
