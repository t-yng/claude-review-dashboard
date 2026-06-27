import { NextResponse } from "next/server";
import { listOwners } from "@/lib/github/repos";
import { errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/owners — リポジトリのオーナー候補（自分 + 所属組織） */
export async function GET() {
  try {
    const owners = await listOwners();
    return NextResponse.json({ owners });
  } catch (error) {
    return errorResponse(error);
  }
}
