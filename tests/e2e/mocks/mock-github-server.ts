/**
 * Mock HTTP server that simulates GitHub API for e2e tests.
 * This runs as an actual HTTP server so the spawned MCP server process can connect to it.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import type { IssueReference } from '../../../src/github/types.js';

// Mock data
const mockIssue: IssueReference = {
  id: 123456789,
  number: 42,
  title: 'Test Issue',
  state: 'open',
  html_url: 'https://github.com/testowner/testrepo/issues/42',
  user: { login: 'testuser' },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const mockBlockingIssues: IssueReference[] = [
  {
    ...mockIssue,
    id: 100000001,
    number: 10,
    title: 'Blocker Issue 1',
    html_url: 'https://github.com/testowner/testrepo/issues/10',
  },
  {
    ...mockIssue,
    id: 100000002,
    number: 20,
    title: 'Blocker Issue 2',
    state: 'closed',
    html_url: 'https://github.com/testowner/testrepo/issues/20',
  },
];

const mockSubIssues: IssueReference[] = [
  {
    ...mockIssue,
    id: 200000001,
    number: 101,
    title: 'Sub-issue 1',
    html_url: 'https://github.com/testowner/testrepo/issues/101',
  },
  {
    ...mockIssue,
    id: 200000002,
    number: 102,
    title: 'Sub-issue 2',
    html_url: 'https://github.com/testowner/testrepo/issues/102',
  },
  {
    ...mockIssue,
    id: 200000003,
    number: 103,
    title: 'Sub-issue 3',
    state: 'closed',
    html_url: 'https://github.com/testowner/testrepo/issues/103',
  },
];

const mockParentIssue: IssueReference = {
  ...mockIssue,
  id: 300000001,
  number: 50,
  title: 'Parent Issue',
  html_url: 'https://github.com/testowner/testrepo/issues/50',
};

interface MockServer {
  server: Server;
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

function parseUrl(url: string): { pathname: string; method: string } {
  const urlObj = new URL(url, 'http://localhost');
  return { pathname: urlObj.pathname, method: '' };
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function send404(res: ServerResponse): void {
  sendJson(res, { message: 'Not Found' }, 404);
}

function send201(res: ServerResponse): void {
  res.writeHead(201);
  res.end();
}

function send204(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const method = req.method || 'GET';
  const url = req.url || '/';

  // Parse the path
  // Expected patterns:
  // /repos/:owner/:repo/issues/:issue_number/dependencies/blocked_by
  // /repos/:owner/:repo/issues/:issue_number/dependencies/blocking
  // /repos/:owner/:repo/issues/:issue_number/dependencies/blocked_by/:issue_id
  // /repos/:owner/:repo/issues/:issue_number/parent
  // /repos/:owner/:repo/issues/:issue_number/sub_issues
  // /repos/:owner/:repo/issues/:issue_number/sub_issue
  // /repos/:owner/:repo/issues/:issue_number/sub_issues/priority

  const pathParts = url.split('/').filter(Boolean);

  // Minimum path: repos/owner/repo/issues/number/...
  if (pathParts.length < 6 || pathParts[0] !== 'repos' || pathParts[3] !== 'issues') {
    send404(res);
    return;
  }

  const issueNumber = pathParts[4];
  const subPath = pathParts.slice(5).join('/');

  // Handle 404 for non-existent issues
  if (issueNumber === '9999') {
    send404(res);
    return;
  }

  // Route based on subPath and method
  if (subPath === 'dependencies/blocked_by') {
    if (method === 'GET') {
      // Return empty for issue #1, otherwise return mock blocking issues
      if (issueNumber === '1') {
        sendJson(res, []);
      } else {
        sendJson(res, mockBlockingIssues);
      }
    } else if (method === 'POST') {
      send201(res);
    } else {
      send404(res);
    }
  } else if (subPath.startsWith('dependencies/blocked_by/')) {
    if (method === 'DELETE') {
      send204(res);
    } else {
      send404(res);
    }
  } else if (subPath === 'dependencies/blocking') {
    if (method === 'GET') {
      if (issueNumber === '1') {
        sendJson(res, []);
      } else {
        sendJson(res, mockBlockingIssues);
      }
    } else {
      send404(res);
    }
  } else if (subPath === 'parent') {
    if (method === 'GET') {
      // Return 404 for issue #1 (no parent)
      if (issueNumber === '1') {
        send404(res);
      } else {
        sendJson(res, mockParentIssue);
      }
    } else {
      send404(res);
    }
  } else if (subPath === 'sub_issues') {
    if (method === 'GET') {
      if (issueNumber === '1') {
        sendJson(res, []);
      } else {
        sendJson(res, mockSubIssues);
      }
    } else if (method === 'POST') {
      send201(res);
    } else {
      send404(res);
    }
  } else if (subPath === 'sub_issue') {
    if (method === 'DELETE') {
      send204(res);
    } else {
      send404(res);
    }
  } else if (subPath === 'sub_issues/priority') {
    if (method === 'PATCH') {
      sendJson(res, { success: true });
    } else {
      send404(res);
    }
  } else {
    send404(res);
  }
}

/**
 * Create and start a mock GitHub API server.
 * @returns The mock server instance with port and baseUrl
 */
export async function createMockGitHubServer(): Promise<MockServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(handleRequest);

    server.on('error', (err) => {
      reject(err);
    });

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }

      const port = address.port;
      const baseUrl = `http://127.0.0.1:${port}`;

      resolve({
        server,
        port,
        baseUrl,
        close: () =>
          new Promise((resolveClose) => {
            server.close(() => resolveClose());
          }),
      });
    });
  });
}
