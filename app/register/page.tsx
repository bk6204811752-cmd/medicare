"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import { sendVerificationOtpAction, registerShopAction } from "@/app/auth-actions";

// ─── Storage helpers for persisting form across redirect ─────
const STORAGE_KEY = "medicare_reg_form";

function saveFormData(data: Record<string, string>) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

function loadFormData(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearFormData() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// ─── Buttons ─────────────────────────────────────────────────

function SendOtpButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-opacity"
    >
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending code...</> : <><Mail className="h-5 w-5" /> Send Verification Code</>}
    </button>
  );
}

function VerifyAndRegisterButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-opacity"
    >
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Verifying & Registering...</> : <><ShieldCheck className="h-5 w-5" /> Verify & Register</>}
    </button>
  );
}

function PasswordInput({ name, id, placeholder, autoComplete, value, onChange }: {
  name: string; id: string; placeholder: string; autoComplete: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name} id={id} type={show ? "text" : "password"}
        className="h-12 w-full rounded-md border border-slate-300 px-3 pr-12 text-base outline-med-green"
        placeholder={placeholder} autoComplete={autoComplete} required
        value={value} onChange={onChange}
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

// ─── Main Form ───────────────────────────────────────────────

function RegisterForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const step = searchParams.get("step");
  const emailFromUrl = searchParams.get("email") || "";
  const isVerifyStep = step === "verify";

  const [formData, setFormData] = useState({
    shopName: "", ownerName: "", phone: "", email: "",
    password: "", confirmPassword: "",
    city: "", state: "", gstin: "", drugLicenseNo: ""
  });
  const [loaded, setLoaded] = useState(false);

  // Load saved form data on mount
  useEffect(() => {
    const saved = loadFormData();
    if (saved) {
      setFormData(prev => ({ ...prev, ...saved }));
    }
    if (isVerifyStep && emailFromUrl) {
      setFormData(prev => ({ ...prev, email: emailFromUrl }));
    }
    setLoaded(true);
  }, [isVerifyStep, emailFromUrl]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      saveFormData(updated);
      return updated;
    });
  }, []);

  // Save form data before submitting step 1 (OTP request)
  const handleStep1Submit = useCallback(() => {
    saveFormData(formData);
  }, [formData]);

  // Don't render until we've loaded from storage to avoid flicker
  if (!loaded) return null;

  // ─── Step 2: Verify OTP ──────────────────────────────────
  if (isVerifyStep) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5 sm:py-10">
        <form
          action={async (fd: FormData) => {
            clearFormData();
            return registerShopAction(fd);
          }}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6"
        >
          <Link href="/" className="font-display text-2xl font-bold text-med-navy">Medicare</Link>
          <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Verify your email</h1>
          <p className="mt-1 text-sm text-slate-500">
            We sent a 6-digit verification code to <strong className="text-med-navy">{emailFromUrl || formData.email}</strong>. Enter it below to complete registration.
          </p>

          {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          {success ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{success}</p> : null}

          {/* Hidden fields carry registration data through */}
          <input type="hidden" name="email" value={emailFromUrl || formData.email} />
          <input type="hidden" name="shopName" value={formData.shopName} />
          <input type="hidden" name="ownerName" value={formData.ownerName} />
          <input type="hidden" name="phone" value={formData.phone} />
          <input type="hidden" name="password" value={formData.password} />
          <input type="hidden" name="confirmPassword" value={formData.confirmPassword} />
          <input type="hidden" name="city" value={formData.city} />
          <input type="hidden" name="state" value={formData.state} />
          <input type="hidden" name="gstin" value={formData.gstin} />
          <input type="hidden" name="drugLicenseNo" value={formData.drugLicenseNo} />

          <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="otp">Verification Code</label>
          <input
            id="otp" name="otp" inputMode="numeric" maxLength={6} minLength={6}
            className="mt-2 h-14 w-full rounded-md border-2 border-emerald-300 px-3 text-2xl tracking-[0.4em] text-center font-mono outline-med-green bg-emerald-50/50 focus:border-med-green transition-colors"
            placeholder="● ● ● ● ● ●"
            autoComplete="one-time-code"
            autoFocus
            required
          />
          <p className="mt-2 text-xs text-slate-400 text-center">Code is valid for 10 minutes</p>

          <VerifyAndRegisterButton />

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/register" className="flex items-center gap-1 font-semibold text-med-greenDark">
              <ArrowLeft className="h-4 w-4" /> Back to form
            </Link>
            <form action={sendVerificationOtpAction} className="inline">
              {/* Re-send OTP with same form data */}
              <input type="hidden" name="email" value={emailFromUrl || formData.email} />
              <input type="hidden" name="shopName" value={formData.shopName} />
              <input type="hidden" name="ownerName" value={formData.ownerName} />
              <input type="hidden" name="phone" value={formData.phone} />
              <input type="hidden" name="password" value={formData.password} />
              <input type="hidden" name="confirmPassword" value={formData.confirmPassword} />
              <input type="hidden" name="city" value={formData.city} />
              <input type="hidden" name="state" value={formData.state} />
              <input type="hidden" name="gstin" value={formData.gstin} />
              <input type="hidden" name="drugLicenseNo" value={formData.drugLicenseNo} />
              <button type="submit" className="font-semibold text-med-greenDark hover:underline">
                Resend code
              </button>
            </form>
          </div>
        </form>
      </main>
    );
  }

  // ─── Step 1: Registration Form ─────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5 sm:py-10">
      <form
        action={sendVerificationOtpAction}
        onSubmit={handleStep1Submit}
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6"
      >
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">Medicare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Register pharmacy</h1>
        <p className="mt-1 text-sm text-slate-500">Fill in your details. We&apos;ll verify your email before submitting for admin approval.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Shop name</span>
            <input name="shopName" value={formData.shopName} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Shop name" autoComplete="organization" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Owner name</span>
            <input name="ownerName" value={formData.ownerName} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Owner name" autoComplete="name" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Email</span>
            <input name="email" type="email" value={formData.email} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Email for login" autoComplete="email" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Phone</span>
            <input name="phone" value={formData.phone} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Phone" autoComplete="tel" required />
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Password</span>
            <PasswordInput name="password" id="password" placeholder="Set password" autoComplete="new-password" value={formData.password} onChange={handleChange} />
            <p className="text-xs text-slate-400">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Confirm password</span>
            <PasswordInput name="confirmPassword" id="confirmPassword" placeholder="Confirm password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} />
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">City</span>
            <input name="city" value={formData.city} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="City" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">State</span>
            <input name="state" value={formData.state} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="State" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">GSTIN</span>
            <input name="gstin" value={formData.gstin} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="GSTIN" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Drug license no.</span>
            <input name="drugLicenseNo" value={formData.drugLicenseNo} onChange={handleChange} className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Drug license no." />
          </label>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-50 p-3">
          <Mail className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs leading-5 text-emerald-800">
            A verification code will be sent to your email. After email verification, your registration will be submitted for admin approval.
          </p>
        </div>
        <SendOtpButton />
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Already registered? Login</Link>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
