/**
 * Stdio-based MCP client for e2e tests.
 * Implements the MCP protocol over stdio using JSON-RPC 2.0.
 */

import { Readable, Writable } from 'stream';
import { createInterface } from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolCallResult {
  content: Array<{
    type: string;
    text?: string;
  }>;
  isError?: boolean;
  structuredContent?: unknown;
}

export class StdioMcpClient {
  private messageId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private readlineInterface: ReturnType<typeof createInterface>;
  private isConnected = false;

  constructor(
    private stdin: Writable,
    stdout: Readable
  ) {
    // Set up line-by-line reading of stdout
    this.readlineInterface = createInterface({
      input: stdout,
      crlfDelay: Infinity,
    });

    this.readlineInterface.on('line', (line) => {
      this.handleMessage(line);
    });
  }

  private handleMessage(line: string): void {
    if (!line.trim()) return;

    try {
      const message = JSON.parse(line) as JsonRpcResponse;

      // Check if this is a response to a pending request
      if ('id' in message && message.id !== null) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(
              new Error(`JSON-RPC Error: ${message.error.message}`)
            );
          } else {
            pending.resolve(message.result);
          }
        }
      }
    } catch {
      // Ignore non-JSON messages (could be debug output)
    }
  }

  private sendMessage(message: JsonRpcRequest | JsonRpcNotification): void {
    const json = JSON.stringify(message);
    this.stdin.write(json + '\n');
  }

  private async sendRequest(
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const id = ++this.messageId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.sendMessage(request);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 10000);
    });
  }

  private sendNotification(
    method: string,
    params?: Record<string, unknown>
  ): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.sendMessage(notification);
  }

  /**
   * Initialize the MCP connection with the server.
   */
  async initialize(): Promise<{
    protocolVersion: string;
    serverInfo: { name: string; version: string };
    capabilities: Record<string, unknown>;
  }> {
    const result = (await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test-client', version: '1.0.0' },
    })) as {
      protocolVersion: string;
      serverInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
    };

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});
    this.isConnected = true;

    return result;
  }

  /**
   * List all available tools from the server.
   */
  async listTools(): Promise<{ tools: ToolDefinition[] }> {
    if (!this.isConnected) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return (await this.sendRequest('tools/list', {})) as {
      tools: ToolDefinition[];
    };
  }

  /**
   * Call a tool on the server.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResult> {
    if (!this.isConnected) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return (await this.sendRequest('tools/call', {
      name,
      arguments: args,
    })) as ToolCallResult;
  }

  /**
   * Close the client connection.
   */
  close(): void {
    this.readlineInterface.close();
    this.isConnected = false;
  }
}
