"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faSpinner } from "@fortawesome/free-solid-svg-icons";
import FormField from "~/app/setup/[login]/components/FormField";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Language } from "~/types";

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
  env?: Record<string, string>;
  packageDependencies?: Record<string, string>;
}

interface SetupProps {
  org: string;
  repo: string;
  settings: RepoSettings;
}

const InputGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
);

import { useEffect, useRef } from "react";

const Setup: React.FC<SetupProps> = ({
  org,
  repo,
  settings: initialSettings,
}) => {
  const [settings, setSettings] = useState<RepoSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    commands: false,
    directories: false,
    advanced: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Saving Settings...");
  const loadingSteps = [
    "Saving Settings...",
    "Cloning Repo...",
    "Installing Dependencies...",
    "Building...",
    "Validating Settings...",
    "Reviewing Build Status...",
    "Creating Project...",
  ];
  const stepIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  const saveSettings = api.onboarding.saveSettings.useMutation();
  const checkBuildQuery = api.onboarding.checkBuild.useQuery(
    {
      org,
      repoName: repo,
    },
    { enabled: false }, // disabled because we don't want to run it on initial render
  );

  const verifyAndEnableIssues = api.github.verifyAndEnableIssues.useMutation();

  useEffect(() => {
    if (isLoading) {
      const maxTimeout = 20000;
      const minTimeout = 10000;
      const timeout =
        Math.floor(Math.random() * minTimeout) + (maxTimeout - minTimeout);
      intervalRef.current = setInterval(() => {
        stepIndexRef.current =
          (stepIndexRef.current + 1) % (loadingSteps.length - 1);
        setLoadingMessage(loadingSteps[stepIndexRef.current] ?? "");
      }, timeout);

      // Set a timeout to switch to the final message after cycling through the others
      setTimeout(
        () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setLoadingMessage(loadingSteps[loadingSteps.length - 1] ?? "");
        },
        maxTimeout * (loadingSteps.length - 1),
      );
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleValidateSettings = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await saveSettings.mutateAsync({
        settings,
        org,
        repo,
      });

      const issuesResult = await verifyAndEnableIssues.mutateAsync({
        org,
        repo,
      });

      if (!issuesResult.success) {
        setErrorMessage(issuesResult.message);
      } else {
        const result = await checkBuildQuery.refetch();
        if (result.data && result.data.length > 0) {
          console.log("result.data", result.data);
          setErrorMessage(result.data);
        } else {
          router.push(`/dashboard/${org}/${repo}`);
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred while validating settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBuild = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await saveSettings.mutateAsync({
        settings,
        org,
        repo,
      });

      const issuesResult = await verifyAndEnableIssues.mutateAsync({
        org,
        repo,
      });

      if (!issuesResult.success) {
        setErrorMessage(issuesResult.message);
      } else {
        router.push(`/dashboard/${org}/${repo}`);
      }
    } catch (error) {
      setErrorMessage("An error occurred while skipping the build process.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await saveSettings.mutateAsync({
        settings,
        org,
        repo,
      });
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSection = (
    title: string,
    sectionKey: keyof typeof expandedSections,
    fields: JSX.Element,
  ) => (
    <div className="mb-8 w-full">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="mb-4 flex w-full items-center justify-between text-left text-xl font-semibold text-aurora-900"
      >
        <span>{title}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`transition-transform ${
            expandedSections[sectionKey] ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {expandedSections[sectionKey] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <InputGrid>{fields}</InputGrid>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mt-8 w-full max-w-4xl"
    >
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white to-indigo-50/50 shadow-xl">
        <div className="rounded-t-3xl border border-b-0 border-aurora-100 bg-aurora-50 p-8">
          <h1 className="mb-2 font-crimson text-4xl font-bold tracking-tight text-aurora-900">
            Configure Your Project
          </h1>
          <p className="text-xl text-aurora-700">
            JACoB scanned your project and found these settings. Please review
            and adjust as needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-8  p-8">
          {renderSection(
            "Basic Settings",
            "basic",
            <>
              <FormField
                label="Language"
                name="language"
                value={settings.language}
                onChange={handleChange}
                type="select"
                options={Object.values(Language).map((lang) => ({
                  value: lang,
                  label: lang,
                }))}
                tooltip="Select the primary language for your project"
              />
              <FormField
                label="Style"
                name="style"
                value={settings.style}
                onChange={handleChange}
                type="select"
                options={Object.values(Style).map((style) => ({
                  value: style,
                  label: style,
                }))}
                tooltip="Choose the styling approach for your project"
              />
            </>,
          )}

          {renderSection(
            "Commands",
            "commands",
            <>
              <FormField
                label="Install Command"
                name="installCommand"
                value={settings.installCommand}
                onChange={handleChange}
                placeholder="npm install"
                tooltip="Command used to install dependencies before building"
              />
              <FormField
                label="Format Command"
                name="formatCommand"
                value={settings.formatCommand}
                onChange={handleChange}
                placeholder="npm run lint:fix"
                tooltip="Command used to fix formatting"
              />
              <FormField
                label="Build Command"
                name="buildCommand"
                value={settings.buildCommand}
                onChange={handleChange}
                placeholder="npm run build"
                tooltip="Command used to build the project"
              />
              {/* <FormField
                label="Test Command"
                name="testCommand"
                value={settings.testCommand}
                onChange={handleChange}
                placeholder="npm run test"
                tooltip="Command used to run tests"
              /> */}
            </>,
          )}

          {renderSection(
            "Directories",
            "directories",
            <>
              {Object.entries(settings.directories ?? {}).map(
                ([key, value]) => (
                  <FormField
                    key={key}
                    label={key}
                    name={`directories.${key}`}
                    value={value}
                    onChange={handleChange}
                    tooltip={`Path for ${key} directory`}
                  />
                ),
              )}
            </>,
          )}

          {renderSection(
            "Advanced Settings",
            "advanced",
            <>
              <FormField
                label="Icon Set"
                name="iconSet"
                value={settings.iconSet}
                onChange={handleChange}
                type="select"
                options={[
                  { value: "", label: "Select an icon set" },
                  ...Object.values(IconSet).map((iconSet) => ({
                    value: iconSet,
                    label: iconSet,
                  })),
                ]}
                tooltip="Preferred icon set for the project"
              />
              <FormField
                label="Write Tests"
                name="testing.writeTests"
                value={settings.testing?.writeTests ? "true" : "false"}
                onChange={handleChange}
                type="checkbox"
                tooltip="Enable automatic test generation"
              />
              <FormField
                label="Environment Variables"
                name="envVariables"
                value={Object.entries(settings.env ?? {})
                  .map(([key, value]) => `${key}=${value}`)
                  .join("\n")}
                onChange={(e) => {
                  const envObj = Object.fromEntries(
                    e.target.value.split("\n").map((line) => {
                      const [key, ...valueParts] = line.split("=");
                      return [key?.trim(), valueParts.join("=").trim()];
                    }),
                  );
                  setSettings((prev) => ({ ...prev, env: envObj }));
                }}
                type="textarea"
                placeholder="KEY=value"
                tooltip="Environment variables needed for the app to build (for testing, not production)"
                className="col-span-2"
              />
            </>,
          )}

          <div className="pt-4">
            <button
              type="button"
              onClick={handleValidateSettings}
              className="mx-auto mb-4 flex w-full max-w-xl transform items-center justify-center space-x-2 rounded-lg bg-aurora-500 px-6 py-3 text-lg font-semibold text-white shadow-md transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-aurora-600 focus:outline-none focus:ring-2 focus:ring-aurora-400 focus:ring-offset-2 active:translate-y-0"
            >
              {isLoading ? (
                <span>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="mr-2 animate-spin"
                  />
                  {loadingMessage}
                </span>
              ) : (
                <span>Validate Settings</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSkipBuild}
              className="mx-auto flex w-full max-w-xl transform items-center justify-center space-x-2 rounded-lg bg-gray-300 px-6 py-3 text-lg font-semibold text-gray-700 shadow-md transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 active:translate-y-0"
            >
              Skip Build
            </button>

            {errorMessage && (
              <div className="mt-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
                <h3 className="font-bold">Error:</h3>
                <p>{errorMessage}</p>
                <p className="mt-2">
                  Please update the configuration or fix the code and push the
                  changes to the main branch, then try again.
                </p>
                <a
                  className="text-xs text-blueGray-500"
                  href={`/dashboard/${org}/${repo}`}
                >
                  Skip this for now
                </a>
              </div>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default Setup;