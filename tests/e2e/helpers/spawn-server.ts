/**
 * Helper to spawn and manage the MCP server process for e2e tests.
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SpawnedServer {
  process: ChildProcess;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  kill: () => void;
}

/**
 * Spawns the MCP server as a child process.
 *
 * @param env - Environment variables to pass to the server
 * @returns A promise that resolves when the server is ready
 */
export async function spawnServer(
  env?: Record<string, string>
): Promise<SpawnedServer> {
  const serverPath = resolve(__dirname, '../../../dist/index.js');

  const proc = spawn('node', [serverPath], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!proc.stdin || !proc.stdout || !proc.stderr) {
    throw new Error('Failed to create stdio streams for server process');
  }

  // Log stderr for debugging (server logs go to stderr)
  proc.stderr.on('data', (data: Buffer) => {
    const message = data.toString();
    // Only log if it's not the startup message
    if (!message.includes('MCP server running')) {
      console.error(`[server stderr]: ${message}`);
    }
  });

  // Handle process errors
  proc.on('error', (error) => {
    console.error('Server process error:', error);
  });

  return {
    process: proc,
    stdin: proc.stdin,
    stdout: proc.stdout,
    stderr: proc.stderr,
    kill: () => {
      proc.kill('SIGTERM');
    },
  };
}

/**
 * Kills the server process and waits for it to exit.
 */
export async function killServer(server: SpawnedServer): Promise<void> {
  return new Promise((resolve) => {
    server.process.on('exit', () => {
      resolve();
    });
    server.kill();
    // Force kill after 5 seconds
    setTimeout(() => {
      server.process.kill('SIGKILL');
      resolve();
    }, 5000);
  });
}
