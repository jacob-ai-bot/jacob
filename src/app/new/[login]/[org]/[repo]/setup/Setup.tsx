"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket, faArrowRight } from "@fortawesome/free-solid-svg-icons";
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

const Setup: React.FC = () => {
  const [settings, setSettings] = useState<Partial<RepoSettings>>({
    language: Language.TypeScript,
    style: Style.CSS,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("RepoSettings:", settings);
    // TODO: Submit to endpoint
  };

  const inputClasses =
    "w-full rounded-full border-2 border-aurora-200 bg-white px-4 py-2 text-aurora-700 shadow-sm transition-all duration-300 focus:border-aurora-500 focus:outline-none focus:ring-2 focus:ring-aurora-500/50";
  const labelClasses = "mb-2 block text-sm font-medium text-aurora-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mt-8 max-w-4xl"
    >
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white to-indigo-50/50 shadow-xl">
        <div className="rounded-t-3xl border border-b-0 border-aurora-100 bg-aurora-50 p-8">
          <h1 className="mb-2 font-crimson text-4xl font-bold tracking-tight text-aurora-900">
            Configure Your Project
          </h1>
          <p className="text-xl text-aurora-700">
            Set up your JACoB project with these configuration options.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 p-8">
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className={labelClasses}>Language</label>
              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className={inputClasses}
              >
                {Object.values(Language).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className={labelClasses}>Style</label>
              <select
                name="style"
                value={settings.style}
                onChange={handleChange}
                className={inputClasses}
              >
                {Object.values(Style).map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </motion.div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className={labelClasses}>Install Command</label>
              <input
                type="text"
                name="installCommand"
                value={settings.installCommand ?? ""}
                onChange={handleChange}
                placeholder="npm install"
                className={inputClasses}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className={labelClasses}>Build Command</label>
              <input
                type="text"
                name="buildCommand"
                value={settings.buildCommand ?? ""}
                onChange={handleChange}
                placeholder="npm run build"
                className={inputClasses}
              />
            </motion.div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className={labelClasses}>Output Directory</label>
              <input
                type="text"
                name="outputDirectory"
                value={settings.directories?.staticAssets ?? ""}
                onChange={handleChange}
                placeholder="dist"
                className={inputClasses}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label className={labelClasses}>Icon Set</label>
              <select
                name="iconSet"
                value={settings.iconSet}
                onChange={handleChange}
                className={inputClasses}
              >
                <option value="">Select an icon set</option>
                {Object.values(IconSet).map((iconSet) => (
                  <option key={iconSet} value={iconSet}>
                    {iconSet}
                  </option>
                ))}
              </select>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <label className={labelClasses}>Environment Variables</label>
            <textarea
              name="envVariables"
              value={settings.envVariables?.exampleFile ?? ""}
              onChange={handleChange}
              placeholder="KEY=value"
              className="min-h-[100px] w-full resize-y rounded-none border-2 border-aurora-200 bg-white px-4 py-2 text-aurora-700 shadow-sm transition-all duration-300 focus:border-aurora-500 focus:outline-none focus:ring-2 focus:ring-aurora-500/50"
            />
            <p className="mt-2 text-sm text-aurora-600">
              Paste a .env above to populate the form
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-4"
          >
            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-full bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transition-all duration-300 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span className="relative z-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faRocket} className="mr-2" />
                <span>Deploy Project</span>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="ml-2 transform transition-transform duration-300 group-hover:translate-x-1"
                />
              </span>
            </button>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
};

export default Setup;
