import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  ["Free", "₹0", "500 bills/month", "1 staff user", "Barcode scan", "Basic reports"],
  ["Basic", "₹299", "2,000 bills/month", "3 staff users", "GST reports", "WhatsApp links"],
  ["Pro", "₹599", "Unlimited bills", "10 staff users", "Schedule H register", "Data export"]
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-med-mist px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-med-greenDark">MedCare</Link>
        <h1 className="mt-4 font-display text-4xl font-bold text-med-navy">Start free, upgrade only when it earns its keep</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map(([name, price, ...items]) => (
            <article key={name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-med-navy">{name}</h2>
              <p className="mt-3 font-display text-3xl font-bold text-med-navy">{price}<span className="text-sm font-medium text-slate-500">/mo</span></p>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                {items.map((item) => (
                  <li key={item} className="flex gap-2"><Check className="h-4 w-4 text-med-green" /> {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
