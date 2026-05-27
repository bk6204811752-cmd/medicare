const fs = require('fs');
const path = require('path');

// Robust local .env loader to support Prisma 7 CLI without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      // Clean line endings and trim
      const cleanLine = line.replace(/\r/g, '').trim();
      if (!cleanLine || cleanLine.startsWith('#')) continue;
      
      const match = cleanLine.match(/^([\w.-]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        // Remove surrounding quotes if any
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
};
