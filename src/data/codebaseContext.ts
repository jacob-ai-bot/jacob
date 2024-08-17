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
  {
    code: [
      "(type_alias_declaration) 3: type ComponentProps = {\n  imageUrl?: string;\n};",
    ],
    file: "/src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Design.tsx",
    text: "The code defines a TypeScript type alias named `ComponentProps`, which is used to specify the props that can be passed to a React component. The `ComponentProps` type includes an optional property `imageUrl` of type `string`, allowing the component to optionally receive a URL for an image. This structure is typical in React components where props are defined to manage the data flow into the component. The use of TypeScript enhances type safety and clarity in the component's API, ensuring that only the expected types are passed as props.",
    diagram:
      "```mermaid\nclassDiagram\n    class ComponentProps {\n        +string imageUrl\n    }\n```",
    exports: [],
    overview:
      "Defines a TypeScript type alias for component props in a React component.",
    importedFiles: [
      "/src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Design.tsx",
    ],
    importStatements: ['import React from "react";'],
    referencedImportDetails: [],
  },
  {
    code: [
      "(type_alias_declaration) 10: type IssueComponentProps = {\n  issue: Issue | undefined;\n};",
    ],
    file: "/src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Issue.tsx",
    text: "The `Issue.tsx` file defines a TypeScript type alias `IssueComponentProps`, which is used to specify the props for a React component that handles displaying issue-related information. The type includes a single property, `issue`, which can either be an `Issue` object or `undefined`. This structure allows the component to handle cases where the issue data may not be available. The file imports several dependencies, including icons from Font Awesome, utilities for string manipulation and styling from the app's utils, and a Markdown renderer for displaying formatted text. The `Issue` type is imported from the server-side API routes, indicating that this component interacts with backend data structures. Additionally, it imports a `renderers` module from a sibling component, suggesting that it may utilize custom rendering logic for displaying chat messages related to issues.",
    diagram:
      "```mermaid\nclassDiagram\n    class IssueComponentProps {\n        +Issue issue\n    }\n    class Issue {\n        <<interface>>\n    }\n    class FontAwesomeIcon {\n        <<component>>\n    }\n    class Markdown {\n        <<component>>\n    }\n    class gfm {\n        <<library>>\n    }\n    class capitalize {\n        <<utility>>\n    }\n    class statusStyles {\n        <<utility>>\n    }\n    IssueComponentProps --> Issue : uses\n    IssueComponentProps --> FontAwesomeIcon : uses\n    IssueComponentProps --> Markdown : uses\n    IssueComponentProps --> gfm : uses\n    IssueComponentProps --> capitalize : uses\n    IssueComponentProps --> statusStyles : uses\n```",
    exports: [],
    overview:
      "This file defines the props type for an Issue component in a dashboard workspace.",
    importedFiles: [
      "/src/app/utils.ts",
      "/src/server/api/routers/events.ts",
      "/src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatMessage.tsx",
      "/src/images/Logo.tsx",
      "/src/trpc/client.tsx",
      "/src/trpc/react.tsx",
      "/src/trpc/server.ts",
    ],
    importStatements: [
      'import gfm from "remark-gfm";',
      'import { faCircleDot } from "@fortawesome/free-solid-svg-icons";',
      'import { faGithub } from "@fortawesome/free-brands-svg-icons";',
      'import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";',
      'import { capitalize, statusStyles } from "~/app/utils";',
      'import Markdown from "react-markdown";',
      'import { type Issue } from "~/server/api/routers/events";',
      'import { renderers } from "../chat/ChatMessage";',
    ],
    referencedImportDetails: [
      {
        name: "statusStyles",
        source: "/src/app/utils.ts",
        line_no: 6,
        overview:
          "The `utils.ts` file provides utility functions and constants for processing strings, managing tasks, and extracting information from messages.",
        exportType: "lexical_declaration",
        code_referenced:
          'export const statusStyles = {\n  open: "bg-green-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",\n  closed:\n    "bg-red-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",\n  merged:\n    "bg-purple-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",\n};',
      },
      {
        name: "capitalize",
        source: "/src/app/utils.ts",
        line_no: 72,
        overview:
          "The `utils.ts` file provides utility functions and constants for processing strings, managing tasks, and extracting information from messages.",
        exportType: "lexical_declaration",
        code_referenced:
          'export const capitalize = (s: string): string => {\n  if (typeof s !== "string") return "";\n  return s.charAt(0).toUpperCase() + s.slice(1);\n};',
      },
      {
        name: "Issue",
        source: "/src/server/api/routers/events.ts",
        line_no: 79,
        overview:
          "This file defines a TRPC router for managing events related to issues in a repository, including task creation and event fetching.",
        exportType: "type_alias_declaration",
        code_referenced:
          'export type Issue = {\n  type: TaskType.issue;\n  id: string;\n  issueId: number;\n  title: string;\n  description: string;\n  createdAt: string;\n  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  comments: ReturnType<any>[];\n  author: string;\n  assignee: string;\n  status: "open" | "closed";\n  link: string;\n  stepsToAddressIssue?: string | null;\n  issueQualityScore?: number | null;\n  commitTitle?: string | null;\n  filesToCreate?: string[] | null;\n  filesToUpdate?: string[] | null;\n};',
      },
      {
        name: "",
        source: "/src/trpc/client.tsx",
        line_no: 25,
        overview:
          "This file sets up a TRPC client for a Next.js application, enabling communication with a TRPC backend.",
        exportType: "",
        code_referenced: "export { trpcClient };",
      },
      {
        name: "api",
        source: "/src/trpc/react.tsx",
        line_no: 29,
        overview:
          "This file sets up the TRPC client and provider for managing server state in a React application.",
        exportType: "lexical_declaration",
        code_referenced: "export const api = createTRPCReact<AppRouter>();",
      },
      {
        name: "api",
        source: "/src/trpc/server.ts",
        line_no: 22,
        overview:
          "This file sets up a TRPC context with cached headers for API calls.",
        exportType: "lexical_declaration",
        code_referenced: "export const api = createCaller(createContext);",
      },
    ],
  },
];

export default CONTEXT_ITEMS as ContextItem[];
