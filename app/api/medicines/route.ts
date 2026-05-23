import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { getMedicines } from "@/lib/local-db";

export async function GET() {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ data: await getMedicines() });
  } catch (error) {
    console.error("Medicines GET error:", error);
    return NextResponse.json({ error: "Failed to load medicines" }, { status: 500 });
  }
}
