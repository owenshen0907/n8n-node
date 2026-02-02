#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyFileIfExists(srcFilePath, destFilePath) {
  try {
    await fs.access(srcFilePath);
  } catch {
    return;
  }
  await ensureDir(path.dirname(destFilePath));
  await fs.copyFile(srcFilePath, destFilePath);
}

async function copyDirRecursive(srcDirPath, destDirPath) {
  try {
    const entries = await fs.readdir(srcDirPath, { withFileTypes: true });
    await ensureDir(destDirPath);
    for (const entry of entries) {
      const src = path.join(srcDirPath, entry.name);
      const dest = path.join(destDirPath, entry.name);
      if (entry.isDirectory()) {
        await copyDirRecursive(src, dest);
      } else if (entry.isFile()) {
        await fs.copyFile(src, dest);
      }
    }
  } catch {
    // ignore missing dirs
  }
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const dist = path.join(root, 'dist');

  await copyDirRecursive(path.join(root, 'icons'), path.join(dist, 'icons'));
  await copyFileIfExists(path.join(root, 'README.md'), path.join(dist, 'README.md'));
  await copyDirRecursive(path.join(root, 'templates'), path.join(dist, 'templates'));

  // Copy icon to node and credential directories so n8n can resolve file:stepfun.png
  const iconSrc = path.join(root, 'icons', 'stepfun.png');
  await copyFileIfExists(iconSrc, path.join(dist, 'nodes', 'StepFunTts', 'stepfun.png'));
  await copyFileIfExists(iconSrc, path.join(dist, 'credentials', 'stepfun.png'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

