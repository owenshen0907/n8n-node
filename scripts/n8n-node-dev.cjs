#!/usr/bin/env node

const path = require('path');

async function main() {
  const { execute } = await import('@oclif/core');
  const cliRoot = path.dirname(require.resolve('n8n-node-dev/package.json'));
  const cliBinDir = path.join(cliRoot, 'bin');
  await execute({ dir: cliBinDir, args: process.argv.slice(2) });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
