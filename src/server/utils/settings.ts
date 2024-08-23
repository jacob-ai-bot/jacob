import fs from "fs";
import path from "path";
import { traverseCodebase } from "../analyze/traverse";
import { z } from "zod";
import { sendGptRequestWithSchema } from "../openai/request";

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
  language: Language;
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
    tsConfig?: string;
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
  packageDependencies?: Record<string, any>;
}

function getBaseRepoSettings(rootPath: string): {
  settings: RepoSettings;
  packageJson: Record<string, any> | undefined;
} {
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

  const defaultTSConfig = "tsconfig.json";
  const tsConfig = settingsFromFile?.directories?.tsConfig ?? defaultTSConfig;
  const hasTSConfig = fs.existsSync(path.join(rootPath, tsConfig));
  const settings: RepoSettings = {
    language: hasTSConfig ? Language.TypeScript : Language.JavaScript,
    ...settingsFromFile,
  };

  if (typeof packageJson?.dependencies === "object") {
    settings.packageDependencies = packageJson.dependencies;
  }

  return { settings, packageJson };
}

export function getRepoSettings(rootPath: string): RepoSettings {
  const { settings } = getBaseRepoSettings(rootPath);
  return settings;
}

export async function generateRepoSettings(
  rootPath: string,
): Promise<RepoSettings> {
  const { settings, packageJson } = getBaseRepoSettings(rootPath);
  const generatedSettings = await generateSettings(
    settings,
    rootPath,
    packageJson ?? {},
  );
  return { ...settings, ...generatedSettings };
}

async function generateSettings(
  settings: RepoSettings,
  rootPath: string,
  packageJson: Record<string, any>,
): Promise<Partial<RepoSettings>> {
  const files = traverseCodebase(rootPath);
  const repoSettingsSchema = z.object({
    language: z.enum(["TypeScript", "JavaScript"]),
    style: z.enum(["Tailwind", "CSS"]).optional(),
    installCommand: z.string().optional(),
    formatCommand: z.string().optional(),
    buildCommand: z.string().optional(),
    testCommand: z.string().optional(),
    iconSet: z
      .enum([
        "Font Awesome",
        "Heroicons",
        "Unicons",
        "React Feather",
        "Material UI",
        "Styled Icons",
        "IconPark",
        "CoreUI",
        "Iconify",
        "Lucide",
      ])
      .optional(),
    componentExamples: z.string().optional(),
    apiEndpointsExamples: z.string().optional(),
    pageExamples: z.string().optional(),
    directories: z
      .object({
        components: z.string().optional(),
        pages: z.string().optional(),
        styles: z.string().optional(),
        staticAssets: z.string().optional(),
        tailwindConfig: z.string().optional(),
        tsConfig: z.string().optional(),
        types: z.string().optional(),
      })
      .optional(),
    stateManagement: z
      .object({
        tool: z.string().optional(),
      })
      .optional(),
    testing: z
      .object({
        writeTests: z.boolean().optional(),
      })
      .optional(),
    storybook: z
      .object({
        writeStories: z.boolean().optional(),
        storiesLocation: z.string().optional(),
      })
      .optional(),
    envVariables: z
      .object({
        exampleFile: z.string().optional(),
      })
      .optional(),
    env: z.record(z.string(), z.string()).optional(),
    packageDependencies: z.record(z.string(), z.string()).optional(),
  });

  const systemPrompt = `
You are an AI assistant tasked with analyzing a project's structure and generating appropriate settings. You will be provided with the contents of the package.json file and a list of all files in the codebase. Your goal is to generate a RepoSettings object that accurately reflects the project's configuration.

Here's the schema for the RepoSettings object:
const repoSettingsSchema = z.object({
    language: z.enum(["TypeScript", "JavaScript"]),
    style: z.enum(["Tailwind", "CSS"]).optional(),
    installCommand: z.string().optional(),
    formatCommand: z.string().optional(),
    buildCommand: z.string().optional(),
    testCommand: z.string().optional(),
    iconSet: z
      .enum([
        "Font Awesome",
        "Heroicons",
        "Unicons",
        "React Feather",
        "Material UI",
        "Styled Icons",
        "IconPark",
        "CoreUI",
        "Iconify",
        "Lucide",
      ])
      .optional(),
    componentExamples: z.string().optional(),
    apiEndpointsExamples: z.string().optional(),
    pageExamples: z.string().optional(),
    directories: z
      .object({
        components: z.string().optional(),
        pages: z.string().optional(),
        styles: z.string().optional(),
        staticAssets: z.string().optional(),
        tailwindConfig: z.string().optional(),
        tsConfig: z.string().optional(),
        types: z.string().optional(),
      })
      .optional(),
    stateManagement: z
      .object({
        tool: z.string().optional(),
      })
      .optional(),
    testing: z
      .object({
        writeTests: z.boolean().optional(),
      })
      .optional(),
    storybook: z
      .object({
        writeStories: z.boolean().optional(),
        storiesLocation: z.string().optional(),
      })
      .optional(),
    envVariables: z
      .object({
        exampleFile: z.string().optional(),
      })
      .optional(),
    env: z.record(z.string(), z.string()).optional(),
    packageDependencies: z.record(z.string(), z.string()).optional(),
  });

Please analyze the provided information and generate a RepoSettings object that adheres to this schema. Use the comments after each field as guidance for what information to infer or provide reasonable defaults for. Your response MUST adhere EXACTLY to the schema provided.
If you are unable to infer an optional value, please omit it. If you are unable to infer a required value, please use the default provided.`;

  const userPrompt = `
Based on the following package.json content and file structure, please generate a RepoSettings object that accurately represents the project's configuration. Ensure that all fields are filled out to the best of your ability based on the available information.

package.json:
${JSON.stringify(packageJson, null, 2)}

File structure:
${files.join("\n")}

Please provide a complete RepoSettings object that adheres to the schema provided in the system prompt. Include all relevant information you can infer from the package.json and file structure. If you're unsure about a particular field, you may omit it or provide a reasonable default value based on the comments in the schema.

For reference, here are some default values and considerations:
- language: Default to "TypeScript" if a tsconfig.json file is present, otherwise "JavaScript"
- style: Default to "Tailwind" if tailwind.config.js is present, otherwise "CSS"
- installCommand: Default to "npm install"
- buildCommand: Default to "npm run build --verbose"
- directories.components: Default to "/src/components" or "/components"
- directories.pages: Default to "/src/pages" or "/app"
- directories.styles: Default to "/src/styles"
- directories.staticAssets: Default to "/public/assets"
- directories.tailwindConfig: Default to "/tailwind.config.js" if Tailwind is used
- directories.types: Default to "/src/types" for TypeScript projects
- iconSet: Default to "Font Awesome"

Ensure that the generated object is valid according to the provided schema. Your response MUST adhere EXACTLY to the RepoSettings schema provided. ONLY respond with the RepoSettings object, no code blocks or other formatting or comments.
`;

  const generatedSettings = await sendGptRequestWithSchema(
    userPrompt,
    systemPrompt,
    repoSettingsSchema,
    0.2,
    undefined,
    5,
  );

  return { ...settings, ...generatedSettings };
}
