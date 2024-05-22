import { testTransaction } from "orchid-orm";
import { db } from "~/server/db/db";
import { beforeEach, afterEach, beforeAll, afterAll } from "vitest";

import { createMocks } from "node-mocks-http";
import type { NextRequest } from "next/server";

export function createMockNextRequest(
  reqOptions: Parameters<typeof createMocks>[0],
): NextRequest {
  const { req: request } = createMocks(reqOptions);
  const nextReq = request as unknown as NextRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (nextReq as { headers: any }).headers = {
    get: (name: string) => request.headers[name],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  (nextReq as { json: any }).json = async () => {
    return reqOptions?.body ?? {};
  };
  return nextReq;
}

export const useTestDatabase = () => {
  beforeAll(async () => {
    await testTransaction.start(db);
  });

  beforeEach(async () => {
    await testTransaction.start(db);
  });

  afterEach(async () => {
    await testTransaction.rollback(db);
  });

  afterAll(async () => {
    await testTransaction.close(db);
  });
};
