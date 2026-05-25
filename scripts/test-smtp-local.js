/* eslint-disable @typescript-eslint/no-require-imports */
const dns = require("node:dns/promises");
const fs = require("node:fs/promises");
const path = require("node:path");
const nodemailer = require("nodemailer");

const GOOGLE_SMTP_FALLBACK_IPS = [
  "142.250.115.108",
  "173.194.77.108",
  "74.125.142.108",
  "64.233.184.108"
];

async function resolveHostViaHttps(hostname) {
  const ips = [];

  // Try Google DNS-over-HTTPS
  try {
    console.log("  Attempting Google DNS-over-HTTPS (DoH)...");
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`);
    if (res.ok) {
      const data = await res.json();
      if (data.Answer && Array.isArray(data.Answer)) {
        for (const ans of data.Answer) {
          if (ans.type === 1 && ans.data) {
            ips.push(ans.data);
          }
        }
      }
    }
  } catch (err) {
    console.error("  Google DoH failed:", err.message);
  }

  // Try Cloudflare DNS-over-HTTPS as fallback
  if (ips.length === 0) {
    try {
      console.log("  Attempting Cloudflare DNS-over-HTTPS (DoH)...");
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { Accept: "application/dns-json" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.Answer && Array.isArray(data.Answer)) {
          for (const ans of data.Answer) {
            if (ans.type === 1 && ans.data) {
              ips.push(ans.data);
            }
          }
        }
      }
    } catch (err) {
      console.error("  Cloudflare DoH failed:", err.message);
    }
  }

  return ips;
}

async function run() {
  console.log("Reading .env file...");
  const envPath = path.join(__dirname, "..", ".env");
  const envContent = await fs.readFile(envPath, "utf8");
  
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const firstEquals = trimmed.indexOf("=");
    if (firstEquals === -1) continue;
    const key = trimmed.substring(0, firstEquals).trim();
    let val = trimmed.substring(firstEquals + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM || user;

  console.log("SMTP Config:");
  console.log("  Host:", host);
  console.log("  User:", user);
  console.log("  Pass:", pass ? "***loaded***" : "not found");
  console.log("  Port:", port);
  console.log("  Secure:", secure);
  console.log("  From:", from);

  if (!user || !pass) {
    throw new Error("Missing SMTP credentials in .env");
  }

  console.log("Step 1: Resolving Host...");
  let resolvedHost;
  
  // 1. Try DoH
  const httpsIps = await resolveHostViaHttps(host);
  if (httpsIps.length > 0) {
    resolvedHost = httpsIps[Math.floor(Math.random() * httpsIps.length)];
    console.log(`  DoH resolved ${host} to: ${resolvedHost}`);
  } else {
    // 2. Try Node dns
    try {
      console.log("  DoH failed. Trying Node dns.resolve4...");
      const ips = await dns.resolve4(host);
      resolvedHost = ips[0];
      console.log(`  Node dns resolved ${host} to: ${resolvedHost}`);
    } catch (err) {
      console.warn(`  Node dns failed: ${err.message}`);
      // 3. Fallback to hardcoded list for Gmail
      if (host.includes("gmail.com") || host.includes("googlemail.com")) {
        resolvedHost = GOOGLE_SMTP_FALLBACK_IPS[Math.floor(Math.random() * GOOGLE_SMTP_FALLBACK_IPS.length)];
        console.log(`  Using hardcoded fallback IP for Gmail: ${resolvedHost}`);
      } else {
        resolvedHost = host;
        console.log(`  Falling back to original hostname: ${resolvedHost}`);
      }
    }
  }

  console.log("Step 2: Creating nodemailer transport...");
  const opts = {
    host: resolvedHost,
    port: port,
    secure: secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      servername: host,
    },
  };

  const transport = nodemailer.createTransport(opts);

  console.log("Step 3: Verifying transport connection...");
  try {
    await transport.verify();
    console.log("  Transport verified successfully! SMTP connection works!");
  } catch (err) {
    console.error("  Transport verification failed:", err);
    throw err;
  }

  console.log("Step 4: Sending test email to", user);
  const info = await transport.sendMail({
    from: from,
    to: user,
    subject: "Medicare SMTP Test Email (with DoH)",
    text: "This is a test email sent from Medicare application verification script to verify SMTP settings and DoH pre-resolution.",
    html: "<p>This is a test email sent from Medicare application verification script to verify SMTP settings and DoH pre-resolution.</p>",
  });

  console.log("  Email sent successfully!");
  console.log("  Message ID:", info.messageId);
}

run().catch(console.error);

