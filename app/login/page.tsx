import Link from "next/link";
import { loginAction } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5">
      <form action={loginAction} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Login</h1>
        <p className="mt-1 text-sm text-slate-500">Login with your registered email and password. New shops need admin approval before access.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{params.error}</p> : null}
        {params.success || params.message ? (
          <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{params.success || params.message}</p>
        ) : null}
        <label className="mt-5 block text-sm font-semibold text-med-navy" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="owner@example.com" autoComplete="email" required />
        <label className="mt-4 block text-sm font-semibold text-med-navy" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="mt-2 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Your password" autoComplete="current-password" required />
        <button className="mt-5 min-h-12 w-full rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark">Login</button>
        <div className="mt-4 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <Link href="/register" className="font-semibold text-med-greenDark">Register pharmacy</Link>
          <Link href="/forgot-password" className="font-semibold text-med-greenDark">Forgot password?</Link>
        </div>
        <div className="mt-5 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Demo admin: admin@medcare.local / Admin@12345<br />
          Demo shop: owner@sharmamedical.local / Shop@12345
        </div>
      </form>
    </main>
  );
}
