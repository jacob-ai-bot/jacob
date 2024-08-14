import { dedent } from "ts-dedent";
import { vi, describe, expect, test } from "vitest";
import fs from "fs";

import { traverseCodebase } from "./traverse";

describe("traverseCodebase", () => {
  test("should generate a list of files", async () => {
    vi.spyOn(fs, "readdirSync").mockReturnValue([
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent("file2.js", fs.constants.UV_DIRENT_FILE),
    ]);
    vi.spyOn(fs, "readdirSync").mockReturnValueOnce([
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent(".env", fs.constants.UV_DIRENT_FILE),
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent("file1.js", fs.constants.UV_DIRENT_FILE),
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent("dir1", fs.constants.UV_DIRENT_DIR),
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent("build", fs.constants.UV_DIRENT_DIR),
      // @ts-expect-error Expected 0 arguments, but got 2
      new fs.Dirent("node_modules", fs.constants.UV_DIRENT_DIR),
    ]);
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      dedent`
        /node_modules
        /build
        .env
      `,
    );

    const result = traverseCodebase("/rootpath");
    expect(result).toEqual(["/file1.js", "/dir1/file2.js"]);
  });
});
