#!/usr/bin/env node
/**
 * Post-install script to remove problematic test files from thread-stream packages
 * that cause Next.js build failures
 */

const fs = require('fs');
const path = require('path');

const problematicPaths = [
  'node_modules/thread-stream/test',
  'node_modules/thread-stream/bench.js',
  'node_modules/thread-stream/LICENSE',
  'node_modules/@reown/appkit-controllers/node_modules/thread-stream/test',
  'node_modules/@reown/appkit-controllers/node_modules/thread-stream/bench.js',
  'node_modules/@reown/appkit-controllers/node_modules/thread-stream/LICENSE',
  'node_modules/@reown/appkit-utils/node_modules/thread-stream/test',
  'node_modules/@reown/appkit-utils/node_modules/thread-stream/bench.js',
  'node_modules/@reown/appkit-utils/node_modules/thread-stream/LICENSE',
  'node_modules/@reown/appkit/node_modules/thread-stream/test',
  'node_modules/@reown/appkit/node_modules/thread-stream/bench.js',
  'node_modules/@reown/appkit/node_modules/thread-stream/LICENSE',
];

console.log('🧹 Cleaning problematic thread-stream test files...');

let removed = 0;
for (const filePath of problematicPaths) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed directory: ${filePath}`);
      removed++;
    } else if (stats.isFile()) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed file: ${filePath}`);
      removed++;
    }
  } catch (err) {
    // File/directory doesn't exist - that's fine
  }
}

console.log(`\n🎉 Cleanup complete! Removed ${removed} problematic files/directories.`);
