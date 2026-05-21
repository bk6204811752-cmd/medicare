import { ShoppingCart } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function AddPurchasePage() {
  return (
    <ModulePage
      title="Add Purchase"
      description="Purchase entry route. For now, stock addition is handled from Inventory > Add Stock and linked to suppliers."
      icon={ShoppingCart}
      items={[
        { label: "Stock increment", value: "Active", hint: "Inventory add/update works" },
        { label: "Supplier link", value: "Active", hint: "Stock stores supplier id" },
        { label: "Invoice totals", value: "Next", hint: "Purchase ledger module" }
      ]}
    />
  );
}
