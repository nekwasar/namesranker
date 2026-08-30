import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { exportUserData } from "@/lib/settings";
import { ClaimError } from "@/lib/claims/claim";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const data = await exportUserData(session.sub);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="namesranker-export-${session.sub}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof ClaimError && err.code === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw err;
  }
}
