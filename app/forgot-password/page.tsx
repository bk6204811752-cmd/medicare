import Link from "next/link";
import { forgotPasswordAction } from "@/app/auth-actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <form action={forgotPasswordAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your registered email. A 6-digit OTP will be sent by email.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{params.error}</p> : null}
        <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="owner@example.com" autoComplete="email" required />
        <button className="mt-5 min-h-12 w-full rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark">Send OTP</button>
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Back to login</Link>
      </form>
    </main>
  );
}
