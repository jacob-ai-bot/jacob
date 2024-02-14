import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

import { getRepoSettings } from "./settings";

describe("getRepoSettings", () => {
  const rootPath = "./";
  const settingsFilePath = path.join(rootPath, "jacob.json");
  const packageJsonFilePath = path.join(rootPath, "package.json");

  const fileContents = {
    env: { VAR1: "var1", VAR2: "var2" },
  };
  const packageJsonContents = {
    dependencies: { package1: "1.0.0", package2: "2.0.0" },
  };

  it("returns undefined when there is no jacob.json file", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });
    const settings = getRepoSettings(rootPath);
    expect(settings).toBeUndefined();
  });

  it("returns a valid RepoSettings when there is a jacob.json file", () => {
    const fileContents = {
      env: { VAR1: "var1", VAR2: "var2" },
    };
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === settingsFilePath) {
        return JSON.stringify(fileContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });
    const settings = getRepoSettings(rootPath);
    expect(settings).toStrictEqual(fileContents);
  });

  it("returns a valid RepoSettings when there is no jacob.json file, but there is a package.json file with dependencies", () => {
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === packageJsonFilePath) {
        return JSON.stringify(packageJsonContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });

    const settings = getRepoSettings(rootPath);
    expect(settings).toStrictEqual({
      packageDependencies: packageJsonContents.dependencies,
    });
  });

  it("returns a valid RepoSettings when there is a jacob.json file and a package.json file with dependencies", async () => {
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === settingsFilePath) {
        return JSON.stringify(fileContents);
      } else if (file === packageJsonFilePath) {
        return JSON.stringify(packageJsonContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });

    const settings = getRepoSettings(rootPath);
    console.log("settings", settings);
    expect(settings).toStrictEqual({
      ...fileContents,
      packageDependencies: packageJsonContents.dependencies,
    });
  });
});
