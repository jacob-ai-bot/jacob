import { type NextRequest, NextResponse } from "next/server";
import { NotFoundError } from "pqb";
import { db } from "~/server/db/db";

interface Params {
  key: string;
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { key: readKey } = params;

  try {
    const accessToken = await db.tokens
      .where({ readKey })
      .whereNot({ accessToken: null })
      .get("accessToken")
      .delete();

    return NextResponse.json({ data: { accessToken } });
  } catch (error) {
    console.log(error);
    if (error instanceof NotFoundError) {
      return NextResponse.json({ errors: ["Not Found"] }, { status: 404 });
    }
    return NextResponse.json({ errors: [String(error)] }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { key: writeKey } = params;
  const { accessToken } = (await req.json()) as { accessToken?: string };

  console.log(`postAccessToken: initiated with writeKey: ${writeKey}`);

  try {
    const rowsUpdated = await db.tokens
      .findBy({ writeKey, accessToken: null })
      .update({ accessToken });

    if (rowsUpdated === 0) {
      return NextResponse.json({ errors: ["Not Found"] }, { status: 404 });
    } else {
      return NextResponse.json({ data: {} });
    }
  } catch (error) {
    return NextResponse.json({ errors: [String(error)] }, { status: 500 });
  }
}
