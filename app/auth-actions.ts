"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { clearAuthSession, requireSuperAdmin, setAuthSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import {
  createEmailVerificationOtp,
  createPasswordResetOtp,
  getAllTenants,
  getTenantById,
  getUserByEmailWithPassword,
  getUserNameByEmail,
  registerPendingShop,
  resetPasswordWithOtp,
  updateTenantApproval,
  verifyEmailOtp,
  verifyPassword
} from "@/lib/local-db";
import {
  sendApprovalRequestMail,
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
  sendRegistrationSuccessMail,
  sendShopApprovalStatusMail
} from "@/lib/mailer";
import {
  forgotPasswordSchema,
  loginSchema,
  registerShopSchema,
  resetPasswordSchema,
  sendVerificationOtpSchema,
  verifyEmailOtpSchema
} from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

function redirectWith(path: string, type: "success" | "error", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

// ─── Step 1: Send Email Verification OTP ─────────────────────

export async function sendVerificationOtpAction(formData: FormData) {
  const parsed = sendVerificationOtpSchema.safeParse({
    shopName: formValue(formData, "shopName"),
    ownerName: formValue(formData, "ownerName"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    city: formValue(formData, "city"),
    state: formValue(formData, "state"),
    gstin: formValue(formData, "gstin"),
    drugLicenseNo: formValue(formData, "drugLicenseNo"),
    role: formValue(formData, "role")
  });

  if (!parsed.success) {
    redirectWith("/register", "error", parsed.error.issues[0]?.message || "Please check registration details");
  }
  const data = parsed.data;

  try {
    // Check if email already exists — retry for Azure SQL cold starts
    const existingUser = await withRetry(() => getUserByEmailWithPassword(data.email));
    if (existingUser) {
      redirectWith("/register", "error", "This email is already registered. Please login instead.");
    }

    // Generate and store OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await withRetry(() => createEmailVerificationOtp(data.email, otp));

    // Send verification email
    await sendEmailVerificationOtp(data.email, otp, data.ownerName);
  } catch (error: unknown) {
    // Re-throw Next.js redirect errors — they use throw internally
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("sendVerificationOtpAction error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    redirectWith("/register", "error", "Something went wrong: " + msg);
  }

  // Redirect back to register with verification step
  redirect(`/register?step=verify&email=${encodeURIComponent(data.email)}&role=${encodeURIComponent(data.role)}&success=${encodeURIComponent("Verification code sent to your email. Please check your inbox.")}`);
}

// ─── Step 2: Verify OTP & Complete Registration ──────────────

export async function registerShopAction(formData: FormData) {
  const email = formValue(formData, "email");
  const otp = formValue(formData, "otp");
  const role = formValue(formData, "role");

  // Validate the OTP first
  const otpParsed = verifyEmailOtpSchema.safeParse({ email, otp });
  if (!otpParsed.success) {
    redirect(`/register?step=verify&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}&error=${encodeURIComponent(otpParsed.error.issues[0]?.message || "Invalid OTP")}`);
  }

  // Verify the OTP
  const otpValid = await withRetry(() => verifyEmailOtp(email, otp));
  if (!otpValid) {
    redirect(`/register?step=verify&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}&error=${encodeURIComponent("Invalid or expired verification code. Please request a new one.")}`);
  }

  // Now parse full registration data
  const parsed = registerShopSchema.safeParse({
    shopName: formValue(formData, "shopName"),
    ownerName: formValue(formData, "ownerName"),
    phone: formValue(formData, "phone"),
    email,
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    city: formValue(formData, "city"),
    state: formValue(formData, "state"),
    gstin: formValue(formData, "gstin"),
    drugLicenseNo: formValue(formData, "drugLicenseNo"),
    role: role || "shop_admin"
  });

  if (!parsed.success) {
    redirect(`/register?step=verify&email=${encodeURIComponent(email)}&error=${encodeURIComponent(parsed.error.issues[0]?.message || "Please check registration details")}`);
  }
  const data = parsed.data;

  try {
    await withRetry(() => registerPendingShop(data));

    const isStockist = data.role === "stockist_admin";
    // Await both emails before redirecting — on Vercel serverless,
    // unawaited promises are killed when redirect() terminates the function.
    await Promise.allSettled([
      sendRegistrationSuccessMail(data.email, data.shopName, data.ownerName, isStockist),
      sendApprovalRequestMail({
        shopName: data.shopName,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        isStockist
      })
    ]);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = (error as { code?: string }).code === "P2002" ? "This email or shop is already registered" : "Registration failed";
    redirectWith("/register", "error", message);
  }

  redirectWith("/login", "success", "Registration successful! Your email has been verified. Admin approval is required before you can login. You will receive an email once approved.");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password")
  });

  if (!parsed.success) {
    redirectWith("/login", "error", parsed.error.issues[0]?.message || "Invalid login details");
  }
  const data = parsed.data;

  try {
    const user = await withRetry(() => getUserByEmailWithPassword(data.email));
    if (!user || !(await verifyPassword(data.password, String(user.password_hash)))) {
      redirectWith("/login", "error", "Invalid email or password");
    }
    const validUser = user;

    const role = String(validUser.role);
    const approvalStatus = validUser.approval_status ? String(validUser.approval_status) : null;
    const active = Boolean(validUser.is_active);
    if (role !== "super_admin" && (!active || approvalStatus !== "approved")) {
      const message = approvalStatus === "rejected" ? "Your shop was not approved. Please contact admin." : "Your shop is pending admin approval. You will receive an email once approved.";
      redirectWith("/login", "error", message);
    }

    await withRetry(() => setAuthSession(String(validUser.id)));
    if (role === "super_admin") {
      redirect("/admin/dashboard");
    } else if (role === "stockist_admin" || role === "stockist_staff") {
      redirect("/stockist/dashboard");
    } else {
      redirect("/shop/dashboard");
    }
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("loginAction error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const isConnectionError = msg.toLowerCase().includes("connect") || msg.toLowerCase().includes("sequence");
    const userMsg = isConnectionError
      ? "Database is starting up. Please try again in a few seconds."
      : "Something went wrong. Please try again.";
    redirectWith("/login", "error", userMsg);
  }
}

export async function logoutAction() {
  await clearAuthSession();
  redirect("/login?success=Logged out successfully");
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formValue(formData, "email") });
  if (!parsed.success) {
    redirectWith("/forgot-password", "error", parsed.error.issues[0]?.message || "Enter a valid email");
  }
  const data = parsed.data;

  try {
    const user = await withRetry(() => getUserByEmailWithPassword(data.email));
    if (user) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await withRetry(() => createPasswordResetOtp(String(user.id), otp));
      const userName = String(user.name || "User");
      // Send reset email and await it so errors are surfaced
      await sendPasswordResetOtp(data.email, otp, userName);
    }
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("forgotPasswordAction error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    redirectWith("/forgot-password", "error", "Something went wrong: " + msg);
  }

  redirect(`/reset-password?email=${encodeURIComponent(data.email)}&success=${encodeURIComponent("If the email exists, an OTP has been sent.")}`);
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    email: formValue(formData, "email"),
    otp: formValue(formData, "otp"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword")
  });

  if (!parsed.success) {
    redirectWith(`/reset-password?email=${encodeURIComponent(formValue(formData, "email"))}`, "error", parsed.error.issues[0]?.message || "Invalid reset details");
  }
  const data = parsed.data;

  const ok = await withRetry(() => resetPasswordWithOtp(data.email, data.otp, data.password));
  if (!ok) {
    redirectWith(`/reset-password?email=${encodeURIComponent(data.email)}`, "error", "Invalid or expired OTP");
  }

  redirectWith("/login", "success", "Password reset successfully. You can login now.");
}

export async function approveTenantAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  requireSuperAdmin(user);

  const tenantId = formValue(formData, "tenantId");
  await updateTenantApproval(tenantId, "approved");
  const tenant = await getTenantById(tenantId);
  if (tenant?.email) {
    try {
      const owner = await withRetry(() => prisma.user.findFirst({ where: { tenantId } }));
      const isStockist = owner?.role === "stockist_admin";
      await sendShopApprovalStatusMail({
        to: tenant.email,
        shopName: tenant.name,
        ownerName: tenant.ownerName || "Shop Owner",
        approved: true,
        isStockist
      });
    } catch (e) {
      console.error("Failed to send approval email:", e);
    }
  }
  redirect("/admin/shops?success=Shop approved. Owner can login now.");
}

export async function rejectTenantAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  requireSuperAdmin(user);

  const tenantId = formValue(formData, "tenantId");
  await updateTenantApproval(tenantId, "rejected");
  const tenant = await getTenantById(tenantId);
  if (tenant?.email) {
    try {
      const owner = await withRetry(() => prisma.user.findFirst({ where: { tenantId } }));
      const isStockist = owner?.role === "stockist_admin";
      await sendShopApprovalStatusMail({
        to: tenant.email,
        shopName: tenant.name,
        ownerName: tenant.ownerName || "Shop Owner",
        approved: false,
        isStockist
      });
    } catch (e) {
      console.error("Failed to send rejection email:", e);
    }
  }
  redirect("/admin/shops?success=Shop rejected. Owner has been notified.");
}
