import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <FileQuestion className="mx-auto h-12 w-12 text-slate-400" />
        <h2 className="mt-4 font-display text-xl font-bold text-med-navy">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/shop/dashboard"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-med-green px-6 font-semibold text-white hover:bg-med-greenDark transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
