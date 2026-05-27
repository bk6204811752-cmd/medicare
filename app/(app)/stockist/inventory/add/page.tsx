import { AddStockForm } from "@/components/add-stock-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getMedicines, getSuppliers } from "@/lib/local-db";

export default async function AddStockistInventoryPage() {
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
      <PageHeader
        title="Wholesale Purchase Entry"
        description="Log manufacturer stock receipts, input batches with expiry dates, and configure PTS/PTR wholesale matrix."
      />
      <AddStockForm medicines={medicines} suppliers={suppliers} />
    </>
  );
}
