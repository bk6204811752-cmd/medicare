import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Cache from address at module level — no need to read process.env every call
const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "MedCare <no-reply@medcare.local>";

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

export async function sendPasswordResetOtp(to: string, otp: string) {
  return sendMail({
    to,
    subject: "Your MedCare password reset OTP",
    text: `Your MedCare password reset OTP is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your MedCare password reset OTP is <strong>${otp}</strong>.</p><p>It is valid for 10 minutes.</p>`
  });
}

export async function sendApprovalRequestMail(input: { shopName: string; ownerName: string; email: string; phone: string }) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@medcare.local";
  return sendMail({
    to: adminEmail,
    subject: `New MedCare shop approval needed: ${input.shopName}`,
    text: `${input.ownerName} registered ${input.shopName}. Email: ${input.email}. Phone: ${input.phone}. Open /admin/shops to approve or reject.`,
    html: `<p><strong>${input.ownerName}</strong> registered <strong>${input.shopName}</strong>.</p><p>Email: ${input.email}<br/>Phone: ${input.phone}</p><p>Open <code>/admin/shops</code> to approve or reject.</p>`
  });
}

export async function sendShopApprovalStatusMail(input: { to: string; shopName: string; approved: boolean }) {
  return sendMail({
    to: input.to,
    subject: input.approved ? "Your MedCare shop is approved" : "Your MedCare shop registration needs admin help",
    text: input.approved
      ? `${input.shopName} has been approved. You can now login to MedCare.`
      : `${input.shopName} was not approved yet. Please contact the MedCare admin.`,
    html: input.approved
      ? `<p><strong>${input.shopName}</strong> has been approved.</p><p>You can now login to MedCare.</p>`
      : `<p><strong>${input.shopName}</strong> was not approved yet.</p><p>Please contact the MedCare admin.</p>`
  });
}
