import { describe, afterEach, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { getRepoSettings } from "./settings";

describe("getRepoSettings", () => {
  const settingsPath = "./";
  const settingsFilePath = path.join(settingsPath, "jacob.json");

  afterEach(async () => {
    try {
      await fs.rm(settingsFilePath);
    } catch (e) {
      /* empty */
    }
  });

  it("returns undefined when there is no jacob.json file", () => {
    const settings = getRepoSettings(settingsPath);
    expect(settings).toBeUndefined();
  });

  it("returns undefined when there is no jacob.json file", async () => {
    const fileContents = {
      env: { VAR1: "var1", VAR2: "var2" },
    };
    await fs.writeFile(settingsFilePath, JSON.stringify(fileContents, null, 2));
    const settings = getRepoSettings(settingsPath);
    expect(settings).toMatchObject(fileContents);
  });
});
