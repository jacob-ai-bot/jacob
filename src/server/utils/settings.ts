import { promises as fs } from "fs";
import path from "path";

export interface Settings {
  env?: Record<string, string>;
}

export async function getSettings(rootPath: string) {
  try {
    const settingsContent = await fs.readFile(
      path.join(rootPath, "otto.json"),
      "utf-8",
    );
    return JSON.parse(settingsContent) as Settings;
  } catch (e) {
    return;
  }
}
