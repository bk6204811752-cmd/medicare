import type { SaleLine } from "@/lib/types";

export type GstLineTotal = {
  taxablePaisa: number;
  discountPaisa: number;
  cgstPaisa: number;
  sgstPaisa: number;
  igstPaisa: number;
  gstPaisa: number;
  totalPaisa: number;
};

export function calculateLineTotal(line: SaleLine, interstate = false): GstLineTotal {
  const gross = line.saleRatePaisa * line.quantity;
  const discountPaisa = Math.round((gross * line.discountPercent) / 100);
  const taxablePaisa = gross - discountPaisa;
  const gstPaisa = Math.round((taxablePaisa * line.gstRate) / 100);
  const half = Math.round(gstPaisa / 2);

  return {
    taxablePaisa,
    discountPaisa,
    cgstPaisa: interstate ? 0 : half,
    sgstPaisa: interstate ? 0 : gstPaisa - half,
    igstPaisa: interstate ? gstPaisa : 0,
    gstPaisa,
    totalPaisa: taxablePaisa + gstPaisa
  };
}

export function calculateBillTotals(lines: SaleLine[], interstate = false) {
  const lineTotals = lines.map((line) => calculateLineTotal(line, interstate));
  const subtotalPaisa = lines.reduce((sum, line) => sum + line.saleRatePaisa * line.quantity, 0);
  const discountPaisa = lineTotals.reduce((sum, line) => sum + line.discountPaisa, 0);
  const taxablePaisa = lineTotals.reduce((sum, line) => sum + line.taxablePaisa, 0);
  const cgstPaisa = lineTotals.reduce((sum, line) => sum + line.cgstPaisa, 0);
  const sgstPaisa = lineTotals.reduce((sum, line) => sum + line.sgstPaisa, 0);
  const igstPaisa = lineTotals.reduce((sum, line) => sum + line.igstPaisa, 0);
  const gstPaisa = lineTotals.reduce((sum, line) => sum + line.gstPaisa, 0);
  const unroundedTotalPaisa = lineTotals.reduce((sum, line) => sum + line.totalPaisa, 0);
  const roundedTotalPaisa = Math.round(unroundedTotalPaisa / 100) * 100;

  return {
    lineTotals,
    subtotalPaisa,
    discountPaisa,
    taxablePaisa,
    cgstPaisa,
    sgstPaisa,
    igstPaisa,
    gstPaisa,
    roundOffPaisa: roundedTotalPaisa - unroundedTotalPaisa,
    totalPaisa: roundedTotalPaisa
  };
}
