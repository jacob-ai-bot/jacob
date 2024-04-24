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
