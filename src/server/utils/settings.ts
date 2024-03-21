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
  Lucide = "Lucide",
}

// TODO: add more enums, all options are in the jacob-setup repo

export interface RepoSettings {
  language?: Language;
  style?: Style;
  installCommand?: string;
  formatCommand?: string;
  buildCommand?: string;
  testCommand?: string;
  iconSet?: IconSet;
  componentExamples?: string;
  apiEndpointsExamples?: string;
  pageExamples?: string;
  directories?: {
    components?: string;
    pages?: string;
    styles?: string;
    staticAssets?: string;
    tailwindConfig?: string;
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
  packageDependencies?: Record<string, string>;
}

export function getRepoSettings(rootPath: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let packageJson: Record<string, any> | undefined;
  try {
    const packageJsonContent = fs.readFileSync(
      path.join(rootPath, "package.json"),
      "utf-8",
    );
    packageJson = JSON.parse(packageJsonContent);
  } catch (e) {
    // Ignore failures on repos where we can't load/parse package.json
  }
  let settingsFromFile: RepoSettings | undefined;
  try {
    const settingsContent = fs.readFileSync(
      path.join(rootPath, "jacob.json"),
      "utf-8",
    );
    settingsFromFile = JSON.parse(settingsContent) as RepoSettings;
  } catch (e) {
    // Ignore failures on repos where we can't load/parse jacob.json
  }
  if (typeof packageJson?.dependencies === "object") {
    const settings: RepoSettings = settingsFromFile ?? {};
    settings.packageDependencies = packageJson.dependencies;
    return settings;
  }
  return settingsFromFile;
}
