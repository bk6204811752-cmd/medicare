"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { clearAuthSession, requireSuperAdmin, setAuthSession } from "@/lib/auth";
import {
  createPasswordResetOtp,
  getAllTenants,
  getUserByEmailWithPassword,
  registerPendingShop,
  resetPasswordWithOtp,
  updateTenantApproval,
  verifyPassword
} from "@/lib/local-db";
import { sendApprovalRequestMail, sendPasswordResetOtp, sendShopApprovalStatusMail } from "@/lib/mailer";
import { forgotPasswordSchema, loginSchema, registerShopSchema, resetPasswordSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || "");
}

function redirectWith(path: string, type: "success" | "error", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function registerShopAction(formData: FormData) {
  const parsed = registerShopSchema.safeParse({
    shopName: formValue(formData, "shopName"),
    ownerName: formValue(formData, "ownerName"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    city: formValue(formData, "city"),
    state: formValue(formData, "state"),
    gstin: formValue(formData, "gstin"),
    drugLicenseNo: formValue(formData, "drugLicenseNo")
  });

  if (!parsed.success) {
    redirectWith("/register", "error", parsed.error.issues[0]?.message || "Please check registration details");
  }
  const data = parsed.data;

  try {
    await registerPendingShop(data);
    await sendApprovalRequestMail({
      shopName: data.shopName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone
    });
  } catch (error) {
    const message = (error as { code?: string }).code === "P2002" ? "This email or shop is already registered" : "Registration failed";
    redirectWith("/register", "error", message);
  }

  redirectWith("/login", "success", "Registration submitted. Admin approval is required before login.");
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

  const user = await getUserByEmailWithPassword(data.email);
  if (!user || !verifyPassword(data.password, String(user.password_hash))) {
    redirectWith("/login", "error", "Invalid email or password");
  }
  const validUser = user;

  const role = String(validUser.role);
  const approvalStatus = validUser.approval_status ? String(validUser.approval_status) : null;
  const active = Boolean(validUser.is_active);
  if (role !== "super_admin" && (!active || approvalStatus !== "approved")) {
    const message = approvalStatus === "rejected" ? "Your shop was not approved. Please contact admin." : "Your shop is pending admin approval. Please contact admin.";
    redirectWith("/login", "error", message);
  }

  await setAuthSession(String(validUser.id));
  redirect(role === "super_admin" ? "/admin/dashboard" : "/shop/dashboard");
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

  const user = await getUserByEmailWithPassword(data.email);
  if (user) {
    const otp = crypto.randomInt(100000, 999999).toString();
    await createPasswordResetOtp(String(user.id), otp);
    await sendPasswordResetOtp(data.email, otp);
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

  const ok = await resetPasswordWithOtp(data.email, data.otp, data.password);
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
  const tenant = (await getAllTenants()).find((item) => item.id === tenantId);
  if (tenant?.email) {
    await sendShopApprovalStatusMail({ to: tenant.email, shopName: tenant.name, approved: true });
  }
  redirect("/admin/shops?success=Shop approved. Owner can login now.");
}

export async function rejectTenantAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  requireSuperAdmin(user);

  const tenantId = formValue(formData, "tenantId");
  await updateTenantApproval(tenantId, "rejected");
  const tenant = (await getAllTenants()).find((item) => item.id === tenantId);
  if (tenant?.email) {
    await sendShopApprovalStatusMail({ to: tenant.email, shopName: tenant.name, approved: false });
  }
  redirect("/admin/shops?success=Shop rejected. Owner has been notified.");
}
