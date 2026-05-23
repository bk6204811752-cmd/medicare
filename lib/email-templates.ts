// ---------------------------------------------------------------------------
// Medicare – HTML Email Templates
// All styles are inline for maximum email-client compatibility.
// Brand: MEDICARE | Primary: #059669 | Text: #0f172a | BG: #f1f5f9
// ---------------------------------------------------------------------------

const BRAND = "Medicare";
const BRAND_UPPER = "MEDICARE";
const PRIMARY = "#059669";
const PRIMARY_DARK = "#047857";
const TEXT_COLOR = "#0f172a";
const TEXT_MUTED = "#475569";
const BG_COLOR = "#f1f5f9";
const CARD_BG = "#ffffff";
const BORDER_COLOR = "#e2e8f0";
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const YEAR = "2026";

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function wrapLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!--[if mso]>
  <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td>
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${PRIMARY};padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:3px;font-family:${FONT_STACK};">${BRAND_UPPER}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:${CARD_BG};padding:40px 32px;border-left:1px solid ${BORDER_COLOR};border-right:1px solid ${BORDER_COLOR};">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${CARD_BG};padding:24px 32px;border-top:1px solid ${BORDER_COLOR};border-radius:0 0 12px 12px;border-left:1px solid ${BORDER_COLOR};border-right:1px solid ${BORDER_COLOR};border-bottom:1px solid ${BORDER_COLOR};text-align:center;">
              <p style="margin:0 0 4px 0;font-size:13px;color:${TEXT_MUTED};font-family:${FONT_STACK};">
                &copy; ${YEAR} ${BRAND}. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;font-family:${FONT_STACK};">
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
</body>
</html>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 20px 0;font-size:16px;color:${TEXT_COLOR};font-family:${FONT_STACK};line-height:1.6;">Hi <strong>${name}</strong>,</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 20px 0;font-size:15px;color:${TEXT_COLOR};font-family:${FONT_STACK};line-height:1.7;">${text}</p>`;
}

function otpBlock(otp: string): string {
  const digitCells = otp.split("").map((d) => `<td style="padding:0 4px;"><div style="width:44px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:800;color:${PRIMARY};font-family:'Courier New',Courier,monospace;background-color:#ecfdf5;border:2px solid ${PRIMARY};border-radius:10px;">${d}</div></td>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${digitCells}</tr></table></td></tr></table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:24px 0;" />`;
}

function smallNote(text: string): string {
  return `<p style="margin:0 0 8px 0;font-size:13px;color:${TEXT_MUTED};font-family:${FONT_STACK};line-height:1.6;">${text}</p>`;
}

// ---------------------------------------------------------------------------
// 1. Email Verification OTP
// ---------------------------------------------------------------------------

export function emailVerificationTemplate(
  otp: string,
  ownerName: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} — Verify Your Email Address`;

  const text = `Hi ${ownerName}, your email verification code is ${otp}. Valid for 10 minutes.`;

  const html = wrapLayout(`
    ${greeting(ownerName)}
    ${paragraph("Welcome to Medicare! To complete your registration, please verify your email address using the code below.")}
    ${otpBlock(otp)}
    ${paragraph("Enter this code on the verification page. This code is valid for <strong>10 minutes</strong>.")}
    ${divider()}
    ${smallNote("If you did not create a Medicare account, you can safely ignore this email.")}
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 2. Registration Successful
// ---------------------------------------------------------------------------

export function registrationSuccessTemplate(
  shopName: string,
  ownerName: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} — Registration Successful`;

  const text = `Hi ${ownerName}, congratulations! Your pharmacy "${shopName}" has been registered successfully on Medicare. Your account is pending admin approval. You will receive an email once the admin approves your account. After approval, you can login to Medicare.`;

  const statusRow = (icon: string, label: string, detail: string, bgColor: string) => `
    <tr>
      <td style="padding:14px 20px;background-color:${bgColor};border-bottom:1px solid ${BORDER_COLOR};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="36" style="font-size:20px;vertical-align:middle;">${icon}</td>
            <td style="vertical-align:middle;">
              <span style="font-size:15px;font-weight:600;color:${TEXT_COLOR};font-family:${FONT_STACK};">${label}</span>
              <br />
              <span style="font-size:13px;color:${TEXT_MUTED};font-family:${FONT_STACK};">${detail}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const html = wrapLayout(`
    ${greeting(ownerName)}
    ${paragraph(`Congratulations! Your pharmacy "<strong>${shopName}</strong>" has been registered successfully on Medicare.`)}
    ${paragraph("Your account is now pending admin approval. You will receive an email once the admin approves your account. After approval, you can login to Medicare and start managing your pharmacy.")}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;border:1px solid ${BORDER_COLOR};border-radius:10px;overflow:hidden;">
      ${statusRow("✅", "Registration Complete", "Your pharmacy has been registered", "#ecfdf5")}
      ${statusRow("⏳", "Admin Approval Pending", "Waiting for admin review", "#fffbeb")}
      ${statusRow("🔒", "Login Access", "Available after approval", "#f1f5f9")}
    </table>

    ${divider()}
    ${smallNote("You will be notified by email once the admin reviews your registration.")}
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 3. Admin Approval (Approved)
// ---------------------------------------------------------------------------

export function adminApprovalTemplate(
  shopName: string,
  ownerName: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} — Your Account Has Been Approved! ✅`;

  const text = `Hi ${ownerName}, great news! The admin has approved your pharmacy "${shopName}". You can now login to Medicare and start managing your pharmacy.`;

  const html = wrapLayout(`
    ${greeting(ownerName)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="padding:20px;background-color:#ecfdf5;border-radius:10px;border:1px solid #a7f3d0;">
          <span style="font-size:40px;line-height:1;">✅</span>
          <p style="margin:12px 0 0 0;font-size:18px;font-weight:700;color:${PRIMARY_DARK};font-family:${FONT_STACK};">Account Approved!</p>
        </td>
      </tr>
    </table>

    ${paragraph(`Great news! The admin has approved your pharmacy "<strong>${shopName}</strong>". You can now login to Medicare and start managing your pharmacy.`)}

    <!-- CTA-style box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:${PRIMARY};padding:16px 40px;border-radius:8px;text-align:center;">
                <span style="font-size:16px;font-weight:600;color:#ffffff;font-family:${FONT_STACK};text-decoration:none;">You can now login at your Medicare portal</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${divider()}
    ${smallNote("If you have any questions, feel free to contact the Medicare support team.")}
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 4. Admin Rejection
// ---------------------------------------------------------------------------

export function adminRejectionTemplate(
  shopName: string,
  ownerName: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} — Account Update`;

  const text = `Hi ${ownerName}, your pharmacy "${shopName}" registration was not approved. Please contact the Medicare admin for more details.`;

  const html = wrapLayout(`
    ${greeting(ownerName)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr>
        <td align="center" style="padding:20px;background-color:#fef2f2;border-radius:10px;border:1px solid #fecaca;">
          <span style="font-size:40px;line-height:1;">⚠️</span>
          <p style="margin:12px 0 0 0;font-size:18px;font-weight:700;color:#b91c1c;font-family:${FONT_STACK};">Registration Not Approved</p>
        </td>
      </tr>
    </table>

    ${paragraph(`We regret to inform you that your pharmacy "<strong>${shopName}</strong>" registration was not approved at this time.`)}
    ${paragraph("Please contact the Medicare admin for more details or to discuss next steps.")}

    ${divider()}
    ${smallNote("If you believe this was a mistake, please reach out to the Medicare support team for assistance.")}
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 5. Password Reset OTP
// ---------------------------------------------------------------------------

export function passwordResetOtpTemplate(
  otp: string,
  userName: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} — Password Reset Code`;

  const text = `Hi ${userName}, your password reset code is ${otp}. Valid for 10 minutes. If you didn't request this, please ignore this email.`;

  const html = wrapLayout(`
    ${greeting(userName)}
    ${paragraph("We received a request to reset the password for your Medicare account. Use the code below to proceed.")}
    ${otpBlock(otp)}
    ${paragraph("This code is valid for <strong>10 minutes</strong>. Enter it on the password reset page to set a new password.")}
    ${divider()}
    ${smallNote("If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.")}
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 6. New Shop Approval Request (sent to admin)
// ---------------------------------------------------------------------------

export function newShopApprovalRequestTemplate(
  shopName: string,
  ownerName: string,
  email: string,
  phone: string
): { subject: string; text: string; html: string } {
  const subject = `${BRAND} Admin — New Shop Registration: ${shopName}`;

  const text = `New pharmacy registration: ${shopName} by ${ownerName}. Email: ${email}. Phone: ${phone}. Go to /admin/shops to approve or reject.`;

  const detailRow = (label: string, value: string) => `
    <tr>
      <td style="padding:12px 16px;font-size:14px;font-weight:600;color:${TEXT_MUTED};font-family:${FONT_STACK};border-bottom:1px solid ${BORDER_COLOR};white-space:nowrap;width:120px;">${label}</td>
      <td style="padding:12px 16px;font-size:14px;color:${TEXT_COLOR};font-family:${FONT_STACK};border-bottom:1px solid ${BORDER_COLOR};">${value}</td>
    </tr>`;

  const html = wrapLayout(`
    <p style="margin:0 0 20px 0;font-size:16px;color:${TEXT_COLOR};font-family:${FONT_STACK};line-height:1.6;">Hello <strong>Admin</strong>,</p>
    ${paragraph("A new pharmacy has registered on Medicare and is waiting for your approval.")}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid ${BORDER_COLOR};border-radius:10px;overflow:hidden;">
      <tr>
        <td colspan="2" style="padding:14px 16px;background-color:${PRIMARY};font-size:14px;font-weight:700;color:#ffffff;font-family:${FONT_STACK};letter-spacing:0.5px;">
          📋 &nbsp;Shop Registration Details
        </td>
      </tr>
      ${detailRow("Shop Name", shopName)}
      ${detailRow("Owner", ownerName)}
      ${detailRow("Email", email)}
      ${detailRow("Phone", phone)}
    </table>

    <!-- Admin action reminder -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="padding:16px 20px;background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
          <p style="margin:0;font-size:14px;color:#1e40af;font-family:${FONT_STACK};line-height:1.6;">
            <strong>Action Required:</strong> Please go to <code style="background-color:#dbeafe;padding:2px 8px;border-radius:4px;font-size:13px;color:#1e3a8a;">/admin/shops</code> to review, approve, or reject this registration.
          </p>
        </td>
      </tr>
    </table>

    ${divider()}
    ${smallNote("This is an automated notification from the Medicare system.")}
  `);

  return { subject, text, html };
}
