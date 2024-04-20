import { type NextRequest, NextResponse } from "next/server";
import { type EmitterWebhookEventName } from "@octokit/webhooks";

import { ghApp } from "~/server/webhooks/github";

const handler = async (req: NextRequest) => {
  await ghApp.webhooks.verifyAndReceive({
    id: req.headers.get("X-GitHub-Delivery") ?? "",
    name: req.headers.get("X-GitHub-Event") as EmitterWebhookEventName,
    signature: req.headers.get("X-Hub-Signature-256") ?? "",
    payload: await req.text(),
  });
  return NextResponse.json({ data: "ok" });
};

export { handler as GET, handler as POST };
