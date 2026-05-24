"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Users, BadgeIndianRupee, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Shop Profile", href: "/shop/settings", icon: Store },
    { name: "Invoice Customization", href: "/shop/settings/invoice", icon: ReceiptText },
    { name: "Staff Management", href: "/shop/settings/staff", icon: Users },
    { name: "Subscription Plan", href: "/shop/settings/subscription", icon: BadgeIndianRupee },
  ];

  return (
    <>
      <PageHeader 
        title="Settings" 
        description="Shop profile, GST behavior, invoice numbering, staff permissions, and free-plan limits." 
      />
      
      <div className="grid gap-6 md:grid-cols-12 mt-6">
        {/* Left Sidebar / Top Horizontal Scrollable Tab Navigation */}
        <aside className="md:col-span-3 shrink-0">
          <div className="flex flex-row overflow-x-auto gap-2 pb-3 md:flex-col md:gap-1.5 md:pb-0 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.href === "/shop/settings" 
                ? pathname === "/shop/settings" 
                : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-lg text-sm font-semibold transition-all border shrink-0 whitespace-nowrap ${
                    isActive
                      ? "bg-med-green text-white border-med-green shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-med-green"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="md:col-span-9 min-w-0">
          {children}
        </main>
      </div>
    </>
  );
}
