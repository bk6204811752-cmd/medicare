import { PageHeader } from "@/components/page-header";
import { AddMedicineForm } from "@/components/add-medicine-form";

export default function AddMedicineMasterPage() {
  return (
    <>
      <PageHeader title="Add Medicine" description="Add a new medicine to the master database. Optionally include stock/inventory details." />
      <AddMedicineForm mode="standalone" />
    </>
  );
}
