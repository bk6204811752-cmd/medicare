import Link from "next/link";
import { registerShopAction } from "@/app/auth-actions";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-med-mist px-4 py-6 sm:px-5 sm:py-10">
      <form action={registerShopAction} className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <Link href="/" className="font-display text-2xl font-bold text-med-navy">MedCare</Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-med-navy">Register pharmacy</h1>
        <p className="mt-1 text-sm text-slate-500">Set your login password now. Admin approval is required before your shop can login.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{params.error}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="shopName" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Shop name" autoComplete="organization" required />
          <input name="ownerName" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Owner name" autoComplete="name" required />
          <input name="email" type="email" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Email for login" autoComplete="email" required />
          <input name="phone" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Phone" autoComplete="tel" required />
          <input name="password" type="password" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Set password" autoComplete="new-password" required />
          <input name="confirmPassword" type="password" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Confirm password" autoComplete="new-password" required />
          <input name="city" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="City" />
          <input name="state" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="State" />
          <input name="gstin" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="GSTIN" />
          <input name="drugLicenseNo" className="h-12 rounded-md border border-slate-300 px-3 text-base outline-med-green" placeholder="Drug license no." />
        </div>
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          After submission, your request appears in Super Admin &gt; Shop Management for approval.
        </p>
        <button className="mt-4 min-h-12 w-full rounded-md bg-med-green font-semibold text-white hover:bg-med-greenDark">Submit for admin approval</button>
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-med-greenDark">Already registered? Login</Link>
      </form>
    </main>
  );
}
