/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  {
    url: 'https://unpkg.com/tesseract.js@5.0.5/dist/worker.min.js',
    filename: 'worker.min.js'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core.wasm.js',
    filename: 'tesseract-core.wasm.js'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core.wasm',
    filename: 'tesseract-core.wasm'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core-simd.wasm.js',
    filename: 'tesseract-core-simd.wasm.js'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core-simd.wasm',
    filename: 'tesseract-core-simd.wasm'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core-simd-lstm.wasm.js',
    filename: 'tesseract-core-simd-lstm.wasm.js'
  },
  {
    url: 'https://unpkg.com/tesseract.js-core@5.0.4/tesseract-core-simd-lstm.wasm',
    filename: 'tesseract-core-simd-lstm.wasm'
  },
  {
    url: 'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz',
    filename: 'eng.traineddata.gz'
  }
];

const destDir = path.join(__dirname, '..', 'public', 'ocr');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(destPath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log(`Starting local OCR assets download to ${destDir}...`);
  for (const asset of assets) {
    const destPath = path.join(destDir, asset.filename);
    try {
      await downloadFile(asset.url, destPath);
    } catch (err) {
      console.error(`✗ Failed to download ${asset.filename}:`, err.message);
    }
  }
  console.log('All local OCR assets downloaded successfully! 📴');
}

run();

