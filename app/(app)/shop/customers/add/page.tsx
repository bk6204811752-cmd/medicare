import { CustomerForm } from "@/components/customer-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function AddCustomerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-med-green" />
      </div>
    }>
      <CustomerForm />
    </Suspense>
  );
}
