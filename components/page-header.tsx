"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PageHeader({
  title,
  description,
  action,
  customBackHref
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  customBackHref?: string;
}) {
  const pathname = usePathname();
  let backHref: string | null = null;

  if (customBackHref) {
    backHref = customBackHref;
  } else if (pathname) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 1) {
      const isDashboard =
        (parts[0] === "shop" && parts[1] === "dashboard") ||
        (parts[0] === "stockist" && parts[1] === "dashboard") ||
        (parts[0] === "admin" && parts[1] === "dashboard");

      if (!isDashboard) {
        if (parts.length === 2) {
          backHref = `/${parts[0]}/dashboard`;
        } else {
          backHref = "/" + parts.slice(0, -1).join("/");
        }
      }
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-med-green transition-colors w-fit group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transform group-hover:-translate-x-1 transition-transform" />
          <span>Back to {backHref.endsWith("/dashboard") ? "Dashboard" : "Parent Page"}</span>
        </Link>
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
