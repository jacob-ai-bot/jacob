import { z } from "zod";
import { type ContextItem } from "~/server/utils/codebaseContext";

export const ContextItemSchema = z.object({
  file: z.string(),
  code: z.array(z.string()),
  importStatements: z.array(z.string()),
  text: z.string(),
  diagram: z.string(),
  overview: z.string(),
  importedFiles: z.array(z.string()),
  exports: z.array(
    z.object({
      type: z.string().nullable().optional(),
      name: z.string(),
      exportType: z.string(),
      line_no: z.number(),
      code_referenced: z.string(),
      source: z.string().optional(),
    }),
  ),
  referencedImportDetails: z
    .array(
      z.object({
        name: z.string(),
        exportType: z.string(),
        line_no: z.number(),
        code_referenced: z.string(),
        source: z.string().optional(),
        overview: z.string().optional(),
      }),
    )
    .optional(),
});

export type ContextItemLocal = z.infer<typeof ContextItemSchema>;

export const CONTEXT_ITEMS: ContextItemLocal[] = [
  {
    file: "/src/components/Header.tsx",
    code: [
      "import React from 'react';",
      "import { Logo } from './Logo';",
      "import { Navigation } from './Navigation';",
      "",
      "export const Header: React.FC = () => {",
      "  return (",
      '    <header className="bg-blue-600 text-white p-4">',
      '      <div className="container mx-auto flex justify-between items-center">',
      "        <Logo />",
      "        <Navigation />",
      "      </div>",
      "    </header>",
      "  );",
      "};",
    ],
    importStatements: [
      "import React from 'react';",
      "import { Logo } from './Logo';",
      "import { Navigation } from './Navigation';",
    ],
    text: "This file contains the Header component, which includes the Logo and Navigation components.",
    diagram: "graph TD\n  A[Header] --> B[Logo]\n  A --> C[Navigation]",
    overview:
      "The Header component is a top-level component that renders the website header, including the logo and navigation menu.",
    importedFiles: [
      "/src/components/Logo.tsx",
      "/src/components/Navigation.tsx",
    ],
    exports: [
      {
        name: "Header",
        exportType: "named",
        line_no: 5,
        code_referenced: "export const Header: React.FC = () => {",
      },
    ],
    referencedImportDetails: [
      {
        name: "Logo",
        exportType: "named",
        line_no: 2,
        code_referenced: "import { Logo } from './Logo';",
        source: "/src/components/Logo.tsx",
        overview: "The Logo component renders the website logo.",
      },
      {
        name: "Navigation",
        exportType: "named",
        line_no: 3,
        code_referenced: "import { Navigation } from './Navigation';",
        source: "/src/components/Navigation.tsx",
        overview: "The Navigation component renders the main navigation menu.",
      },
    ],
  },
  {
    file: "/src/components/Footer.tsx",
    code: [
      "import React from 'react';",
      "import { SocialLinks } from './SocialLinks';",
      "",
      "export const Footer: React.FC = () => {",
      "  return (",
      '    <footer className="bg-gray-800 text-white p-8">',
      '      <div className="container mx-auto">',
      '        <div className="flex justify-between items-center">',
      "          <p>&copy; 2023 My Awesome Website</p>",
      "          <SocialLinks />",
      "        </div>",
      "      </div>",
      "    </footer>",
      "  );",
      "};",
    ],
    importStatements: [
      "import React from 'react';",
      "import { SocialLinks } from './SocialLinks';",
    ],
    text: "This file contains the Footer component, which includes the copyright information and SocialLinks component.",
    diagram: "graph TD\n  A[Footer] --> B[SocialLinks]",
    overview:
      "The Footer component is a bottom-level component that renders the website footer, including copyright information and social media links.",
    importedFiles: ["/src/components/SocialLinks.tsx"],
    exports: [
      {
        name: "Footer",
        exportType: "named",
        line_no: 4,
        code_referenced: "export const Footer: React.FC = () => {",
      },
    ],
    referencedImportDetails: [
      {
        name: "SocialLinks",
        exportType: "named",
        line_no: 2,
        code_referenced: "import { SocialLinks } from './SocialLinks';",
        source: "/src/components/SocialLinks.tsx",
        overview:
          "The SocialLinks component renders a list of social media links.",
      },
    ],
  },
  {
    file: "/src/pages/Home.tsx",
    code: [
      "import React from 'react';",
      "import { Header } from '../components/Header';",
      "import { Footer } from '../components/Footer';",
      "import { HeroSection } from '../components/HeroSection';",
      "import { FeatureList } from '../components/FeatureList';",
      "",
      "export const Home: React.FC = () => {",
      "  return (",
      '    <div className="flex flex-col min-h-screen">',
      "      <Header />",
      '      <main className="flex-grow">',
      "        <HeroSection />",
      "        <FeatureList />",
      "      </main>",
      "      <Footer />",
      "    </div>",
      "  );",
      "};",
    ],
    importStatements: [
      "import React from 'react';",
      "import { Header } from '../components/Header';",
      "import { Footer } from '../components/Footer';",
      "import { HeroSection } from '../components/HeroSection';",
      "import { FeatureList } from '../components/FeatureList';",
    ],
    text: "This file contains the Home page component, which includes the Header, HeroSection, FeatureList, and Footer components.",
    diagram:
      "graph TD\n  A[Home] --> B[Header]\n  A --> C[HeroSection]\n  A --> D[FeatureList]\n  A --> E[Footer]",
    overview:
      "The Home component is the main page of the website, combining various components to create a complete layout.",
    importedFiles: [
      "/src/components/Header.tsx",
      "/src/components/Footer.tsx",
      "/src/components/HeroSection.tsx",
      "/src/components/FeatureList.tsx",
    ],
    exports: [
      {
        name: "Home",
        exportType: "named",
        line_no: 7,
        code_referenced: "export const Home: React.FC = () => {",
      },
    ],
    referencedImportDetails: [
      {
        name: "Header",
        exportType: "named",
        line_no: 2,
        code_referenced: "import { Header } from '../components/Header';",
        source: "/src/components/Header.tsx",
        overview: "The Header component renders the website header.",
      },
      {
        name: "Footer",
        exportType: "named",
        line_no: 3,
        code_referenced: "import { Footer } from '../components/Footer';",
        source: "/src/components/Footer.tsx",
        overview: "The Footer component renders the website footer.",
      },
      {
        name: "HeroSection",
        exportType: "named",
        line_no: 4,
        code_referenced:
          "import { HeroSection } from '../components/HeroSection';",
        source: "/src/components/HeroSection.tsx",
        overview:
          "The HeroSection component renders the main hero section of the home page.",
      },
      {
        name: "FeatureList",
        exportType: "named",
        line_no: 5,
        code_referenced:
          "import { FeatureList } from '../components/FeatureList';",
        source: "/src/components/FeatureList.tsx",
        overview:
          "The FeatureList component renders a list of features on the home page.",
      },
    ],
  },
];

export default CONTEXT_ITEMS as ContextItem[];
