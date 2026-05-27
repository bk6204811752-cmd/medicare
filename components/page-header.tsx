"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Hide the back button only on the primary dashboard homepages
  const isDashboardHome =
    pathname === "/shop/dashboard" ||
    pathname === "/shop" ||
    pathname === "/stockist/dashboard" ||
    pathname === "/stockist" ||
    pathname === "/admin/dashboard" ||
    pathname === "/admin";

  return (
    <div className="mb-6 flex flex-col gap-2">
      {!isDashboardHome && (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-med-green transition-colors w-fit group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transform group-hover:-translate-x-1 transition-transform" />
          <span>Go Back</span>
        </button>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-med-navy md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

