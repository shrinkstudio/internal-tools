import { NextResponse, type NextRequest } from "next/server";

// TODO: Re-enable full auth middleware after testing
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
