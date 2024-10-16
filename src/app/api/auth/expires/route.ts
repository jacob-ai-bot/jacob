import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";

// This is used to check if the session is still valid
// It returns the number of milliseconds until the session expires
export async function GET() {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.redirect("/");
  }
  const { user } = session;
  let msToExpiration = 0;
  if (user.expires) {
    // expires is an ISODateString
    const expiresAt = Date.parse(user.expires);
    const currentTime = Date.now();
    msToExpiration = expiresAt - currentTime;
  }

  return NextResponse.json({ expires_in: msToExpiration });
}
