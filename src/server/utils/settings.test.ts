import { describe, afterEach, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { getSettings } from "./settings";

describe("getSettings", () => {
  const settingsPath = "./";
  const settingsFilePath = path.join(settingsPath, "otto.json");

  afterEach(async () => {
    try {
      await fs.rm(settingsFilePath);
    } catch (e) {
      /* empty */
    }
  });

  it("returns undefined when there is no otto.json file", async () => {
    const settings = await getSettings(settingsPath);
    expect(settings).toBeUndefined();
  });

  it("returns undefined when there is no otto.json file", async () => {
    const fileContents = {
      env: { VAR1: "var1", VAR2: "var2" },
    };
    await fs.writeFile(settingsFilePath, JSON.stringify(fileContents, null, 2));
    const settings = await getSettings(settingsPath);
    expect(settings).toMatchObject(fileContents);
  });
});
