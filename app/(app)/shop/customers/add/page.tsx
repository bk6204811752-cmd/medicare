import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default function AddCustomerPage() {
  return (
    <>
      <PageHeader title="Add Customer" description="Create a reusable customer profile for POS lookup, credit tracking, doctors, and loyalty." />
      <CustomerForm />
    </>
  );
}
