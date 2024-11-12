import { type NextRequest, NextResponse } from "next/server";

import { handleLinearWebhook } from "~/server/utils/linear";
import { type LinearWebhookPayload } from "~/types";

export async function POST(request: NextRequest) {
  console.log("Received Linear webhook");
  const json = (await request.json()) as LinearWebhookPayload;
  await handleLinearWebhook(json);
  return NextResponse.json({ data: "ok" });
}
