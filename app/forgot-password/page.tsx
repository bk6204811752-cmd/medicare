"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/app/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-opacity"
    >
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending OTP...</> : "Send OTP"}
    </button>
  );
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <form action={forgotPasswordAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">Medicare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your registered email. A 6-digit OTP will be sent by email.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="owner@example.com" autoComplete="email" required />
        <SubmitButton />
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Back to login</Link>
      </form>
    </main>
  );
}

function ForgotPasswordFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6 space-y-4">
        <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-6 w-40 rounded bg-slate-200 animate-pulse mt-6" />
        <div className="h-4 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded-md bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded-md bg-slate-200 animate-pulse" />
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<ForgotPasswordFallback />}><ForgotPasswordForm /></Suspense>;
}
