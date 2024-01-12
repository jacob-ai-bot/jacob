import fs from "fs";
import path from "path";

export interface Settings {
  language?: string;
  style?: string;
  iconSet?: string;
  componentExamples?: string;
  apiEndpointsExamples?: string;
  pageExamples?: string;
  directories?: {
    components?: string;
    pages?: string;
    styles?: string;
    staticAssets?: string;
  };
  stateManagement?: {
    tool?: string;
  };
  testing?: {
    writeTests?: boolean;
  };
  storybook?: {
    writeStories?: boolean;
    storiesLocation?: string;
  };
  envVariables?: {
    exampleFile?: string;
  };
  env?: Record<string, string>;
}

export function getSettings(rootPath: string) {
  try {
    const settingsContent = fs.readFileSync(
      path.join(rootPath, "jacob.json"),
      "utf-8",
    );
    return JSON.parse(settingsContent) as Settings;
  } catch (e) {
    return;
  }
}
