import dns from "node:dns/promises";
import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import {
  emailVerificationTemplate,
  registrationSuccessTemplate,
  adminApprovalTemplate,
  adminRejectionTemplate,
  passwordResetOtpTemplate,
  newShopApprovalRequestTemplate
} from "@/lib/email-templates";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Cache from address at module level — no need to read process.env every call
const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "Medicare <hojai4828@gmail.com>";

// ─── DNS Pre-resolution ─────────────────────────────────────
// Vercel serverless DNS resolver throws `EBUSY` for SMTP hostnames.
// Pre-resolve hostname → IP via Google / Cloudflare DNS-over-HTTPS (DoH) 
// using standard HTTPS fetch (which always works in Vercel serverless functions).
// Keep node:dns and a static list of Gmail IPs as robust fallbacks.

const GOOGLE_SMTP_FALLBACK_IPS = [
  "142.250.115.108",
  "173.194.77.108",
  "74.125.142.108",
  "64.233.184.108"
];

async function resolveHostViaHttps(hostname: string): Promise<string[]> {
  const ips: string[] = [];

  // 1. Try Google DNS-over-HTTPS
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
      signal: AbortSignal.timeout(3000),
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
    console.error("Google DoH failed:", err);
  }

  // 2. Try Cloudflare DNS-over-HTTPS as a fallback
  if (ips.length === 0) {
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
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
      console.error("Cloudflare DoH failed:", err);
    }
  }

  return ips;
}

let _resolvedHost: string | null = null;
let _resolvePromise: Promise<string> | null = null;

async function resolveSmtpHost(hostname: string): Promise<string> {
  // Always clean the incoming hostname (trim spaces and strip trailing dot)
  const cleanHostname = hostname.trim().replace(/\.$/, "");

  if (_resolvedHost) return _resolvedHost;

  _resolvePromise ??= (async () => {
    // A. Try DNS over HTTPS (DoH) - highly reliable, runs over standard port 443
    try {
      const ips = await resolveHostViaHttps(cleanHostname);
      if (ips.length > 0) {
        _resolvedHost = ips[Math.floor(Math.random() * ips.length)];
        return _resolvedHost;
      }
    } catch (err) {
      console.error("DoH resolution error:", err);
    }

    // B. Try native Node dns.resolve4
    try {
      const ips = await dns.resolve4(cleanHostname);
      if (ips.length > 0) {
        _resolvedHost = ips[0];
        return _resolvedHost;
      }
    } catch (err) {
      console.error("Node dns resolution error:", err);
    }

    // C. Ultimate fallback for smtp.gmail.com
    if (cleanHostname.includes("gmail.com") || cleanHostname.includes("googlemail.com")) {
      _resolvedHost = GOOGLE_SMTP_FALLBACK_IPS[Math.floor(Math.random() * GOOGLE_SMTP_FALLBACK_IPS.length)];
      return _resolvedHost;
    }

    return cleanHostname;
  })();

  return _resolvePromise;
}

// ─── Transport creation ─────────────────────────────────────
// Create a fresh transport for each send (no pooling — Vercel
// functions are short-lived, so pooling causes stale connections).

import SMTPTransport from "nodemailer/lib/smtp-transport";

async function createTransport() {
  const rawHost = process.env.SMTP_HOST;
  const rawUser = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  
  if (!rawHost || !rawUser || !rawPass) return null;

  // Sanitize inputs by trimming and cleaning trailing dots/spaces
  const host = rawHost.trim().replace(/\.$/, "");
  const user = rawUser.trim();
  const pass = rawPass.trim();

  const resolvedHost = await resolveSmtpHost(host);

  const opts: SMTPTransport.Options = {
    host: resolvedHost,
    port: Number((process.env.SMTP_PORT || "587").trim()),
    secure: (process.env.SMTP_SECURE || "false").trim() === "true",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      servername: host, // Connect directly to FQDN (without trailing dots/spaces) for perfect SSL/TLS validation
    },
  };

  return nodemailer.createTransport(opts);
}

// ─── Send with retry ────────────────────────────────────────
// Retry up to 3 times with increasing delay to handle transient
// DNS / connection issues on Vercel serverless cold starts.

async function sendMailWithRetry(
  transport: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  retries = 3
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await transport.sendMail(mailOptions);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const isRetryable =
        msg.includes("EBUSY") ||
        msg.includes("ETIMEOUT") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("EAI_AGAIN");

      if (attempt < retries && isRetryable) {
        // Re-resolve DNS in case the cached IP went stale
        _resolvedHost = null;
        _resolvePromise = null;
        const host = process.env.SMTP_HOST?.trim().replace(/\.$/, "");
        if (host) await resolveSmtpHost(host);
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      throw error;
    }
  }
}


export async function sendMail(input: MailInput) {
  const transport = await createTransport();

  if (transport) {
    await sendMailWithRetry(transport, {
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { delivered: true, mode: "smtp" as const };
  }

  try {
    const outboxDir = path.join(process.cwd(), "data", "mail-outbox");
    await fs.mkdir(outboxDir, { recursive: true });
    const fileName = `${Date.now()}-${input.to.replace(/[^a-z0-9]/gi, "_")}.json`;
    await fs.writeFile(path.join(outboxDir, fileName), JSON.stringify({ ...input, from: fromAddress, createdAt: new Date().toISOString() }, null, 2));
  } catch (error) {
    console.log("Fallback mail delivery to outbox failed (e.g. read-only filesystem on Vercel):", (error as Error).message || error);
    console.log("Mock Email Content:", JSON.stringify(input, null, 2));
  }
  return { delivered: true, mode: "local-outbox" as const };
}

// ─── Email Verification OTP ─────────────────────────────────

export async function sendEmailVerificationOtp(to: string, otp: string, ownerName: string) {
  const template = emailVerificationTemplate(otp, ownerName);
  return sendMail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

// ─── Registration Success ────────────────────────────────────

export async function sendRegistrationSuccessMail(to: string, shopName: string, ownerName: string) {
  const template = registrationSuccessTemplate(shopName, ownerName);
  return sendMail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

// ─── Password Reset OTP ─────────────────────────────────────

export async function sendPasswordResetOtp(to: string, otp: string, userName?: string) {
  const template = passwordResetOtpTemplate(otp, userName || "User");
  return sendMail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

// ─── Admin Notification: New Shop Registered ─────────────────

export async function sendApprovalRequestMail(input: { shopName: string; ownerName: string; email: string; phone: string }) {
  const adminEmail = process.env.ADMIN_EMAIL || "hojai4828@gmail.com";
  const template = newShopApprovalRequestTemplate(input.shopName, input.ownerName, input.email, input.phone);
  return sendMail({
    to: adminEmail,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}

// ─── Shop Approval / Rejection ───────────────────────────────

export async function sendShopApprovalStatusMail(input: { to: string; shopName: string; ownerName: string; approved: boolean }) {
  const template = input.approved
    ? adminApprovalTemplate(input.shopName, input.ownerName)
    : adminRejectionTemplate(input.shopName, input.ownerName);
  return sendMail({
    to: input.to,
    subject: template.subject,
    text: template.text,
    html: template.html
  });
}
