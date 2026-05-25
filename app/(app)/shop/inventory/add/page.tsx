import { AddStockForm } from "@/components/add-stock-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getMedicines, getSuppliers } from "@/lib/local-db";

export default async function AddInventoryPage() {
  const user = await getCurrentUser();
  const [medicineRows, supplierRows] = await Promise.all([getMedicines(), getSuppliers(user?.tenantId ?? "")]);
  const medicines = medicineRows.map((medicine: any) => ({
    id: String(medicine.id),
    name: String(medicine.name),
    genericName: String(medicine.genericName ?? ""),
    gstRate: Number(medicine.gstRate),
    hsnCode: String(medicine.hsnCode ?? ""),
    mrpPaisa: Number(medicine.mrpPaisa),
    packSize: String(medicine.packSize ?? "")
  }));
  const suppliers = supplierRows.map((supplier: any) => ({
    id: String(supplier.id),
    name: String(supplier.name)
  }));

  return (
    <>
      <PageHeader title="Add Stock" description="Free local form prototype for purchase-entry stock creation. It mirrors the fields required by the production schema." />
      <AddStockForm medicines={medicines} suppliers={suppliers} />
    </>
  );
}
