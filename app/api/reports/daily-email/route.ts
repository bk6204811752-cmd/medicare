import { NextResponse } from "next/server";
import { getApprovedTenantsWithOwners, getDailyReport, logDailyReport } from "@/lib/local-db";
import { sendMail } from "@/lib/mailer";
import { formatCurrency } from "@/lib/utils";

export async function POST(request: Request) {
  const secret = process.env.DAILY_REPORT_SECRET;
  if (!secret || request.headers.get("x-report-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = [];
    for (const tenant of await getApprovedTenantsWithOwners()) {
      const to = tenant.ownerEmail || tenant.email;
      if (!to) continue;

      const report = await getDailyReport(tenant.id);
      await sendMail({
        to,
        subject: `Medicare daily report - ${tenant.name} - ${report.reportDate}`,
        text: [
          `Daily report for ${tenant.name}`,
          `Date: ${report.reportDate}`,
          `Bills: ${report.bills}`,
          `Sales: ${formatCurrency(report.totalPaisa)}`,
          `GST: ${formatCurrency(report.gstPaisa)}`,
          `Low stock items: ${report.lowStockCount}`,
          `Expiring batches: ${report.expiringCount}`
        ].join("\n"),
        html: `
          <h2>Daily report for ${tenant.name}</h2>
          <p>Date: <strong>${report.reportDate}</strong></p>
          <ul>
            <li>Bills: <strong>${report.bills}</strong></li>
            <li>Sales: <strong>${formatCurrency(report.totalPaisa)}</strong></li>
            <li>GST: <strong>${formatCurrency(report.gstPaisa)}</strong></li>
            <li>Low stock items: <strong>${report.lowStockCount}</strong></li>
            <li>Expiring batches: <strong>${report.expiringCount}</strong></li>
          </ul>
        `
      });
      await logDailyReport(tenant.id, report.reportDate, to);
      results.push({ tenant: tenant.name, to, report });
    }

    return NextResponse.json({ sent: results.length, results });
  } catch (error) {
    console.error("Daily email error:", error);
    return NextResponse.json({ error: "Failed to send daily reports" }, { status: 500 });
  }
}
