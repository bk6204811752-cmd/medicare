import { WalletCards } from "lucide-react";
import { ModulePage } from "@/components/module-page";
import { getCurrentUser } from "@/lib/auth";
import { getCustomers, getSuppliers } from "@/lib/local-db";
import { formatCurrency } from "@/lib/utils";

export default async function FinancialReportPage() {
  const user = await getCurrentUser();
  const tid = user?.tenantId ?? "";
  const [customers, suppliers] = await Promise.all([getCustomers(tid), getSuppliers(tid)]);
  const receivables = customers.reduce((sum, customer) => sum + customer.outstandingPaisa, 0);
  const payables = suppliers.reduce((sum, supplier) => sum + supplier.balancePaisa, 0);

  return (
    <ModulePage
      title="Financial Report"
      description="Receivables, payables, and cash-flow signals for the shop owner."
      icon={WalletCards}
      items={[
        { label: "Receivables", value: formatCurrency(receivables), hint: "Customer credit outstanding" },
        { label: "Payables", value: formatCurrency(payables), hint: "Supplier balances" },
        { label: "P&L", value: "Next", hint: "Needs purchase-sale margin ledger" }
      ]}
    />
  );
}
