import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createMedicine } from "@/lib/local-db";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const medicine = await createMedicine(body);
    return NextResponse.json({ data: medicine }, { status: 201 });
  } catch (error) {
    console.error("Medicine create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create medicine" },
      { status: 400 }
    );
  }
}
