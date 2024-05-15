import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const org = searchParams.get("org");
  const repo = searchParams.get("repo");

  console.log("request URL", request.url);
  console.log("request nextUrl", String(request.nextUrl));
  console.log("nextUrl origin", request.nextUrl.origin);
  if (org && repo) {
    const response = NextResponse.redirect(
      `${request.nextUrl.origin}/dashboard/${org}/${repo}`,
    );
    response.cookies.set("lastUsedRepo", `${org}/${repo}`);
    return response;
  }

  return NextResponse.redirect(`${request.nextUrl.origin}/`);
}
