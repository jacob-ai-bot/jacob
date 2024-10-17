import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";

// This is used to check if the session is still valid
// It returns the number of milliseconds until the session expires
export async function GET() {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ expires_in: 0 });
  }

  const { user } = session;
  const msToExpiration = user.expires
    ? Date.parse(user.expires) - Date.now()
    : 0;

  return NextResponse.json({ expires_in: msToExpiration });
}
