"use client";

import { useState, useTransition } from "react";
import { User as UserIcon, Lock, ShieldCheck, Mail, Phone, Calendar, Store, CheckCircle, AlertTriangle, UserCheck, Key, ShieldAlert } from "lucide-react";
import { updateProfile, updatePassword } from "./actions";
import type { LocalUser } from "@/lib/local-db";

type ProfileDashboardClientProps = {
  user: LocalUser;
  tenant: Record<string, any>;
};

export function ProfileDashboardClient({ user, tenant }: ProfileDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"details" | "security">("details");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error" | null; text: string }>({ type: null, text: "" });

  // Profile Form States
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: null, text: "" });

    if (!name.trim()) {
      setMessage({ type: "error", text: "Full Name is required." });
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);

    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: res.message || "Profile details updated successfully!" });
      }
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: null, text: "" });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "All password fields are required." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    startTransition(async () => {
      const res = await updatePassword(formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: res.message || "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  // Maps technical role string to user-friendly label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "System Administrator";
      case "shop_admin":
        return "Store Owner / Administrator";
      case "pharmacist":
        return "Licensed Pharmacist";
      case "staff":
        return "Store Assistant / Staff";
      default:
        return "Staff Member";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 items-start animate-fade-in">
      
      {/* LEFT COLUMN: Profile Summary & Stats Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
          {/* Avatar circle */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-med-greenSoft text-med-green border-2 border-med-green/20 flex items-center justify-center text-3xl font-black shadow-inner">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0.5 right-0.5 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" title="Account Active" />
          </div>

          <h2 className="mt-4 font-display text-xl font-bold text-med-navy tracking-tight">{name}</h2>
          <p className="text-xs text-slate-500 font-mono mt-1 select-all">{user.email}</p>
          
          {/* Role Badge */}
          <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-med-green/10 px-3 py-1 text-xs font-bold text-med-greenDark border border-med-green/15 uppercase tracking-wide">
            <UserCheck className="h-3 w-3" />
            {getRoleLabel(user.role)}
          </span>

          <div className="border-t border-slate-100 w-full mt-6 pt-5 space-y-3.5 text-left text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5 font-medium"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined</span>
              <span className="font-semibold text-slate-800">May 2026</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5 font-medium"><Store className="h-3.5 w-3.5 text-slate-400" /> Pharmacy Plan</span>
              <span className="font-black text-med-green uppercase bg-med-greenSoft px-2.5 py-0.5 rounded-md text-[10px] tracking-wide border border-med-green/10">
                {tenant.plan || "Free Tier"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Security Level</span>
              <span className="font-bold text-slate-800 font-mono">SHA-256</span>
            </div>
          </div>
        </div>

        {/* Shop / Tenant Information Card */}
        {tenant && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="h-5 w-5 text-med-navy" />
              <h3 className="font-display font-bold text-med-navy text-sm">Pharmacy Store Details</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Registered Name</span>
                <p className="font-bold text-slate-800 text-sm">{tenant.name}</p>
              </div>
              {tenant.ownerName && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Owner / Promoter</span>
                  <p className="font-semibold text-slate-700">{tenant.ownerName}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {tenant.gstin && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">GSTIN</span>
                    <p className="font-mono text-slate-600 font-bold">{tenant.gstin}</p>
                  </div>
                )}
                {tenant.drugLicenseNo && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Drug License</span>
                    <p className="font-mono text-slate-600 font-bold">{tenant.drugLicenseNo}</p>
                  </div>
                )}
              </div>
              {(tenant.city || tenant.state) && (
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Location</span>
                  <p className="text-slate-600">{tenant.city}, {tenant.state}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Interactive Forms & Tabbed Panels */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Modern Tab Selector Buttons */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab("details"); setMessage({ type: null, text: "" }); }}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition-all ${
              activeTab === "details"
                ? "border-med-green text-med-green font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserIcon className="h-4 w-4" /> Personal Details
          </button>
          <button
            onClick={() => { setActiveTab("security"); setMessage({ type: null, text: "" }); }}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition-all ${
              activeTab === "security"
                ? "border-med-green text-med-green font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Lock className="h-4 w-4" /> Account Security
          </button>
        </div>

        {/* Message Banner container */}
        {message.text && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{message.text}</span>
          </div>
        )}

        {/* TAB 1: Edit Profile Details Form */}
        {activeTab === "details" && (
          <form onSubmit={handleUpdateProfile} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-fade-in">
            <h3 className="font-display font-bold text-med-navy text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserIcon className="h-5 w-5 text-med-green" />
              <span>Update Personal Details</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none"
                    disabled={isPending}
                    required
                  />
                  <UserIcon className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none font-mono"
                    disabled={isPending}
                  />
                  <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Address (Locked)</label>
              <div className="relative">
                <input
                  type="email"
                  value={user.email}
                  className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500 cursor-not-allowed font-mono outline-none"
                  disabled
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                <Lock className="h-3 w-3 shrink-0" />
                This email is locked as it serves as your primary secure login identifier.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-med-green px-5 py-2 text-sm font-bold text-white hover:bg-med-greenDark transition-colors shadow-sm disabled:opacity-50"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Change Password / Account Security Form */}
        {activeTab === "security" && (
          <form onSubmit={handleUpdatePassword} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-fade-in">
            <h3 className="font-display font-bold text-med-navy text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Key className="h-5 w-5 text-med-green" />
              <span>Change Account Password</span>
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none"
                  disabled={isPending}
                  required
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none"
                    disabled={isPending}
                    required
                  />
                  <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full h-11 pl-3 pr-10 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:border-med-green focus:ring-1 focus:ring-med-green outline-none"
                    disabled={isPending}
                    required
                  />
                  <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-med-green px-5 py-2 text-sm font-bold text-white hover:bg-med-greenDark transition-colors shadow-sm disabled:opacity-50"
              >
                Update Password
              </button>
            </div>
          </form>
        )}
        
      </div>
    </div>
  );
}
