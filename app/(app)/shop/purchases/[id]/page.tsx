import { ShoppingCart } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function PurchaseDetailPage() {
  return (
    <ModulePage
      title="Purchase Detail"
      description="Purchase invoice detail route for supplier bills, batches, GST, and payment status."
      icon={ShoppingCart}
      items={[
        { label: "Batches", value: "Linked", hint: "Inventory uses batch-level entries" },
        { label: "Payment status", value: "Planned", hint: "Unpaid, partial, paid" },
        { label: "Supplier return", value: "Ready", hint: "Return route is present" }
      ]}
    />
  );
}
