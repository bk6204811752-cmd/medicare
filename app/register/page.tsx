"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { registerShopAction } from "@/app/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-opacity"
    >
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : "Submit for admin approval"}
    </button>
  );
}

function PasswordInput({ name, id, placeholder, autoComplete }: { name: string; id: string; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} id={id} type={show ? "text" : "password"} className="h-12 w-full rounded-md border border-slate-300 px-3 pr-12 text-base outline-med-green" placeholder={placeholder} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5 sm:py-10">
      <form action={registerShopAction} className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Register pharmacy</h1>
        <p className="mt-1 text-sm text-slate-500">Set your login password now. Admin approval is required before your shop can login.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Shop name</span>
            <input name="shopName" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Shop name" autoComplete="organization" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Owner name</span>
            <input name="ownerName" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Owner name" autoComplete="name" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Email</span>
            <input name="email" type="email" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Email for login" autoComplete="email" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Phone</span>
            <input name="phone" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Phone" autoComplete="tel" required />
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Password</span>
            <PasswordInput name="password" id="password" placeholder="Set password" autoComplete="new-password" />
            <p className="text-xs text-slate-400">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Confirm password</span>
            <PasswordInput name="confirmPassword" id="confirmPassword" placeholder="Confirm password" autoComplete="new-password" />
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">City</span>
            <input name="city" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="City" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">State</span>
            <input name="state" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="State" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">GSTIN</span>
            <input name="gstin" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="GSTIN" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-med-navy">Drug license no.</span>
            <input name="drugLicenseNo" className="h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Drug license no." />
          </label>
        </div>
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          After submission, your request appears in Super Admin &gt; Shop Management for approval.
        </p>
        <SubmitButton />
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Already registered? Login</Link>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
