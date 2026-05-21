import { PageHeader } from "@/components/page-header";
import { BillingPos } from "@/components/billing-pos";

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Smart Billing POS" description="Keyboard-friendly billing with GST, Schedule H checks, barcode scan, print, and free WhatsApp deep-link sharing." />
      <BillingPos />
    </>
  );
}
