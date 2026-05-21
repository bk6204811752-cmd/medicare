import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-med-mist px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="font-display text-3xl font-bold text-med-navy">Setup checklist</h1>
        <div className="mt-6 space-y-3">
          {["Verify phone OTP", "Add shop and license details", "Load opening stock", "Create first bill"].map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-med-green text-sm font-bold text-white">{index + 1}</span>
              <span className="font-medium text-med-navy">{step}</span>
            </div>
          ))}
        </div>
        <Link href="/shop/dashboard" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-med-green px-5 font-semibold text-white">Continue to dashboard</Link>
      </section>
    </main>
  );
}
