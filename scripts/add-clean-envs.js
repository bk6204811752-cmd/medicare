const { spawn } = require('child_process');

function addEnv(name, value) {
  return new Promise((resolve, reject) => {
    console.log(`Adding ${name}...`);
    const child = spawn('npx', ['vercel', 'env', 'add', name, 'production'], {
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    child.stdin.write(value);
    child.stdin.end();
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully added ${name}`);
        resolve();
      } else {
        reject(new Error(`Failed to add ${name} with code ${code}`));
      }
    });
  });
}

async function run() {
  const envs = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'hojai4828@gmail.com',
    SMTP_PASS: 'qvdv gnuf eppn hbzj',
    SMTP_FROM: 'Medicare <hojai4828@gmail.com>',
    DRUG_MASTER_API_KEY: 'BmMW5abyb75RTheKDmaGfQA63vp9QuAkcMUuK51f',
    DRUG_MASTER_API_URL: 'https://www.myupchar.com/api'
  };
  
  for (const [name, value] of Object.entries(envs)) {
    await addEnv(name, value);
  }
  console.log('All env vars added successfully!');
}

run().catch(console.error);
