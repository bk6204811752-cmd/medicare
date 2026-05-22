"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "@/app/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark disabled:opacity-60 transition-opacity"
    >
      {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Logging in...</> : "Login"}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const message = searchParams.get("message");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <form action={loginAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Login</h1>
        <p className="mt-1 text-sm text-slate-500">Login with your registered email and password. New shops need admin approval before access.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {success || message ? (
          <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{success || message}</p>
        ) : null}
        <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="owner@example.com" autoComplete="email" required />
        <label className="mt-4 block text-sm font-semibold text-med-navy" htmlFor="password">Password</label>
        <div className="relative mt-2">
          <input id="password" name="password" type={showPassword ? "text" : "password"} className="h-12 w-full rounded-md border border-slate-300 px-3 pr-12 text-base outline-med-green" placeholder="Your password" autoComplete="current-password" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <SubmitButton />
        <div className="mt-4 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <Link href="/register" className="font-semibold text-med-greenDark">Register pharmacy</Link>
          <Link href="/forgot-password" className="font-semibold text-med-greenDark">Forgot password?</Link>
        </div>
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-5 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Demo admin: admin@medcare.local / Admin@12345<br />
            Demo shop: owner@sharmamedical.local / Shop@12345
          </div>
        )}
      </form>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6 space-y-4">
        <div className="h-8 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-6 w-20 rounded bg-slate-200 animate-pulse mt-6" />
        <div className="h-4 w-64 rounded bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded-md bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded-md bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded-md bg-slate-200 animate-pulse" />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<LoginFallback />}><LoginForm /></Suspense>;
}
