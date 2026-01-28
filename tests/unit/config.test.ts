import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load GITHUB_TOKEN from environment', async () => {
    process.env.GITHUB_TOKEN = 'test-token-123';

    const { loadConfig } = await import('../../src/config.js');
    const config = loadConfig();

    expect(config.githubToken).toBe('test-token-123');
  });

  it('should throw when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;

    const { loadConfig } = await import('../../src/config.js');

    expect(() => loadConfig()).toThrow('GITHUB_TOKEN environment variable is required');
  });

  it('should throw when GITHUB_TOKEN is empty string', async () => {
    process.env.GITHUB_TOKEN = '';

    const { loadConfig } = await import('../../src/config.js');

    expect(() => loadConfig()).toThrow('GITHUB_TOKEN environment variable is required');
  });
});
