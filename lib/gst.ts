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

  // Single-pass accumulation (was 8 separate .reduce() calls)
  let subtotalPaisa = 0;
  let discountPaisa = 0;
  let taxablePaisa = 0;
  let cgstPaisa = 0;
  let sgstPaisa = 0;
  let igstPaisa = 0;
  let gstPaisa = 0;
  let unroundedTotalPaisa = 0;

  for (let i = 0; i < lines.length; i++) {
    subtotalPaisa += lines[i].saleRatePaisa * lines[i].quantity;
    const lt = lineTotals[i];
    discountPaisa += lt.discountPaisa;
    taxablePaisa += lt.taxablePaisa;
    cgstPaisa += lt.cgstPaisa;
    sgstPaisa += lt.sgstPaisa;
    igstPaisa += lt.igstPaisa;
    gstPaisa += lt.gstPaisa;
    unroundedTotalPaisa += lt.totalPaisa;
  }

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
