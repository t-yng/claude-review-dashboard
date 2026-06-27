import { NextResponse } from "next/server";
import { GhError } from "@/lib/github/gh";

/** Shared handler that converts exceptions into JSON error responses. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof GhError) {
    return NextResponse.json(
      { error: error.message, kind: "gh" },
      { status: error.code === null ? 500 : 502 },
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Helper type for resolving Next 15's async params. */
export type RouteParams<T> = { params: Promise<T> };
