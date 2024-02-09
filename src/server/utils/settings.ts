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

export enum IconSet {
  FontAwesome = "Font Awesome",
  Heroicons = "Heroicons",
  Unicons = "Unicons",
  ReactFeather = "React Feather",
  MaterialUI = "Material UI",
  StyledIcons = "Styled Icons",
  IconPark = "IconPark",
  CoreUI = "CoreUI",
  Iconify = "Iconify",
}

// TODO: add more enums, all options are in the jacob-setup repo

export interface RepoSettings {
  language?: Language;
  style?: Style;
  installCommand?: string;
  formatCommand?: string;
  buildCommand?: string;
  iconSet?: IconSet;
  componentExamples?: string;
  apiEndpointsExamples?: string;
  pageExamples?: string;
  directories?: {
    components?: string;
    pages?: string;
    styles?: string;
    staticAssets?: string;
    types?: string;
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
