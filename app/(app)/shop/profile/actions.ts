"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/local-db";

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required" };
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!name) {
    return { error: "Name is required" };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone: phone || null,
      },
    });

    return { success: true, message: "Profile details updated successfully!" };
  } catch (err: any) {
    console.error("updateProfile error:", err);
    return { error: err.message || "Failed to update profile details" };
  }
}

export async function updatePassword(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Authentication required" };
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match" };
  }

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters" };
  }

  try {
    // Fetch user from DB to verify old password
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    const isOldValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isOldValid) {
      return { error: "Current password is incorrect" };
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
      },
    });

    return { success: true, message: "Password changed successfully!" };
  } catch (err: any) {
    console.error("updatePassword error:", err);
    return { error: err.message || "Failed to update password" };
  }
}

export async function updateShopProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.tenantId) {
    return { error: "Authentication required" };
  }

  // Only allow admin roles to update shop profiles
  if (user.role !== "shop_admin" && user.role !== "super_admin") {
    return { error: "Permissions denied. Only store owners can update shop settings." };
  }

  const shopName = String(formData.get("shopName") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const gstin = String(formData.get("gstin") || "").trim();
  const drugLicenseNo = String(formData.get("drugLicenseNo") || "").trim();
  const upiId = String(formData.get("upiId") || "").trim();

  if (!shopName) {
    return { error: "Shop Name is required." };
  }
  if (!phone) {
    return { error: "Shop Contact Phone is required." };
  }

  try {
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: shopName,
        ownerName: ownerName || null,
        phone,
        gstin: gstin || null,
        drugLicenseNo: drugLicenseNo || null,
        upiId: upiId || null,
      },
    });

    return { success: true, message: "Pharmacy details updated successfully!" };
  } catch (err: any) {
    console.error("updateShopProfile error:", err);
    return { error: err.message || "Failed to update pharmacy details." };
  }
}

