import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/supplier-form";

export default function AddSupplierPage() {
  return (
    <>
      <PageHeader title="Add Supplier" description="Create distributor profiles for purchase entries, GSTIN records, credit days, and payables." />
      <SupplierForm />
    </>
  );
}
