/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const srcCoreDir = path.join(__dirname, '..', 'node_modules', 'tesseract.js-core');
const srcWorkerDir = path.join(__dirname, '..', 'node_modules', 'tesseract.js', 'dist');
const destDir = path.join(__dirname, '..', 'public', 'ocr');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Copying Tesseract.js local assets...');

// Copy worker file
const workerSrc = path.join(srcWorkerDir, 'worker.min.js');
const workerDest = path.join(destDir, 'worker.min.js');
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log(`✓ Copied worker.min.js to ${workerDest}`);
} else {
  console.error(`✗ Worker file not found at ${workerSrc}`);
}

// Copy core files
if (fs.existsSync(srcCoreDir)) {
  const files = fs.readdirSync(srcCoreDir);
  let copiedCount = 0;
  for (const file of files) {
    if (file.startsWith('tesseract-core')) {
      const srcFile = path.join(srcCoreDir, file);
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    }
  }
  console.log(`✓ Copied ${copiedCount} core files from node_modules/tesseract.js-core`);
} else {
  console.error(`✗ Core directory not found at ${srcCoreDir}`);
}

console.log('Local Tesseract.js assets copying completed successfully! 📴');

