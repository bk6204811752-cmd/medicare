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

// Module-level singleton transport — reuses TCP connection + TLS handshake
let _transport: nodemailer.Transporter | null = null;
function getTransport() {
  if (!_transport) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;

    _transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      pool: true, // use pooled connections
      maxConnections: 3,
    });
  }
  return _transport;
}

export async function sendMail(input: MailInput) {
  const transport = getTransport();

  if (transport) {
    await transport.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
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
