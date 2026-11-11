#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTortugaMcpServer } from './server.js';

// Auto-discover and load .env file from common project roots
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

export * from './server.js';
export * from './discord.js';

async function main() {
  const server = createTortugaMcpServer();
  const transport = new StdioServerTransport();

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
  console.error('[TortugaMCP] Server started and listening via STDIO.');
}

// If invoked as a CLI executable directly
const isDirectRun =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('tortuga-mcp') ||
    process.argv[1].endsWith('dist/index.js'));

if (isDirectRun) {
  main().catch((err) => {
    console.error('[TortugaMCP] Fatal startup error:', err);
    process.exit(1);
  });
}
