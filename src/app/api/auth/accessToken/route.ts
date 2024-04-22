import { NextResponse } from "next/server";
import { db } from "~/server/db/db";

export async function POST() {
  try {
    const { readKey, writeKey } = await db.tokens.create({});

    return NextResponse.json({ data: { readKey, writeKey } });
  } catch (error) {
    return NextResponse.json({ errors: [String(error)] }, { status: 500 });
  }
}
