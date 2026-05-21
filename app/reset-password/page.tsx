import Link from "next/link";
import { resetPasswordAction } from "@/app/auth-actions";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ email?: string; error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <form action={resetPasswordAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Reset password</h1>
        <p className="mt-1 text-sm text-slate-500">Use the OTP sent to your email and set a new password.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{params.error}</p> : null}
        {params.success ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{params.success}</p> : null}
        <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={params.email || ""} className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" autoComplete="email" required />
        <label className="mt-4 block text-sm font-semibold text-med-navy" htmlFor="otp">OTP</label>
        <input id="otp" name="otp" inputMode="numeric" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="6-digit OTP" autoComplete="one-time-code" required />
        <label className="mt-4 block text-sm font-semibold text-med-navy" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" autoComplete="new-password" required />
        <label className="mt-4 block text-sm font-semibold text-med-navy" htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" autoComplete="new-password" required />
        <button className="mt-5 min-h-12 w-full rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark">Reset password</button>
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Back to login</Link>
      </form>
    </main>
  );
}
