import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";

import { Language, getRepoSettings } from "./settings";

describe("getRepoSettings", async () => {
  const rootPath = "./";
  const settingsFilePath = path.join(rootPath, "jacob.json");
  const packageJsonFilePath = path.join(rootPath, "package.json");

  const fileContents = {
    env: { VAR1: "var1", VAR2: "var2" },
  };
  const packageJsonContents = {
    dependencies: { package1: "1.0.0", package2: "2.0.0" },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns language as either TypeScript or JavaScript when there is no jacob.json file", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });
    await expect(getRepoSettings(rootPath)).resolves.toStrictEqual({
      language: Language.TypeScript,
    });
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    await expect(getRepoSettings(rootPath)).resolves.toStrictEqual({
      language: Language.JavaScript,
    });
  });

  it("returns a valid RepoSettings when there is a jacob.json file", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const fileContents = {
      env: { VAR1: "var1", VAR2: "var2" },
    };
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === settingsFilePath) {
        return JSON.stringify(fileContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });
    const settings = await getRepoSettings(rootPath);
    expect(settings).toStrictEqual({
      ...fileContents,
      language: Language.JavaScript,
    });

    // with language set to TypeScript when tsconfig.json is present
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    await expect(getRepoSettings(rootPath)).resolves.toStrictEqual({
      ...fileContents,
      language: Language.TypeScript,
    });
  });

  it("returns the same jacob.json settings regardless of tsconfig.json when language is specified", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const fileContents = {
      language: Language.JavaScript,
    };
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === settingsFilePath) {
        return JSON.stringify(fileContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });
    const settings = await getRepoSettings(rootPath);
    expect(settings).toStrictEqual(fileContents);

    // with language set to TypeScript when tsconfig.json is present
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    await expect(getRepoSettings(rootPath)).resolves.toStrictEqual(
      fileContents,
    );
  });

  it("returns a valid RepoSettings when there is no jacob.json file, but there is a package.json file with dependencies", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === packageJsonFilePath) {
        return JSON.stringify(packageJsonContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });

    const settings = await getRepoSettings(rootPath);
    expect(settings).toStrictEqual({
      language: Language.JavaScript,
      packageDependencies: packageJsonContents.dependencies,
    });
  });

  it("returns a valid RepoSettings when there is a jacob.json file and a package.json file with dependencies", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation((file) => {
      if (file === settingsFilePath) {
        return JSON.stringify(fileContents);
      } else if (file === packageJsonFilePath) {
        return JSON.stringify(packageJsonContents);
      }
      throw new Error("ENOENT: no such file or directory");
    });

    const settings = await getRepoSettings(rootPath);
    expect(settings).toStrictEqual({
      ...fileContents,
      language: Language.JavaScript,
      packageDependencies: packageJsonContents.dependencies,
    });
  });
});
