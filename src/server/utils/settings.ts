import fs from "fs";
import path from "path";

export enum Language {
  TypeScript = "TypeScript",
  JavaScript = "JavaScript",
}

export enum Style {
  CSS = "CSS",
  Tailwind = "Tailwind",
}

// TODO: add more enums, all options are in the jacob-setup repo

export interface RepoSettings {
  language?: Language;
  style?: Style;
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

export function getRepoSettings(rootPath: string) {
  try {
    const settingsContent = fs.readFileSync(
      path.join(rootPath, "jacob.json"),
      "utf-8",
    );
    return JSON.parse(settingsContent) as RepoSettings;
  } catch (e) {
    return;
  }
}
