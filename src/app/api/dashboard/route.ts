import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const org = searchParams.get("org");
  const repo = searchParams.get("repo");

  if (org && repo) {
    const response = NextResponse.redirect(
      new URL(`/dashboard/${org}/${repo}`, request.nextUrl.href),
    );
    response.cookies.set("lastUsedRepo", `${org}/${repo}`);
    return response;
  }

  return NextResponse.redirect(new URL("/", request.nextUrl.href));
}
