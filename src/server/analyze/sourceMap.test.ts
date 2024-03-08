import dedent from "ts-dedent";
import { describe, expect, test } from "vitest";

import { generateMapFromFiles } from "./sourceMap";

describe("generateMapFromFiles", () => {
  test("should generate the source map", () => {
    const filesSourceMap = [
      {
        filePath: "/path/rootPath/src/src.ts",
        fileName: "src.ts",
        relativePath: "src/src.ts",
        classes: [],
        enums: [],
        functions: [
          {
            name: "function1",
            returnType: "void",
            parameters: [
              {
                name: "param1",
                type: "string",
              },
            ],
          },
          {
            name: "function2",
            returnType: "number",
            parameters: [
              {
                name: "param1",
                type: "boolean",
              },
            ],
          },
        ],
        imports: [],
        interfaces: [
          {
            name: "Interface1",
            properties: [
              {
                name: "prop1",
                type: "string",
              },
              {
                name: "prop2",
                type: "boolean",
              },
            ],
            methods: [
              {
                name: "method1",
                returnType: "void",
                parameters: [
                  {
                    name: "param1",
                    type: "string",
                  },
                ],
              },
              {
                name: "method2",
                returnType: "number",
                parameters: [
                  {
                    name: "param1",
                    type: "boolean",
                  },
                ],
              },
            ],
          },
        ],
        variables: [],
        typeAliases: [],
        exportedDeclarations: [],
      },
    ];
    const sourceMap = generateMapFromFiles(filesSourceMap);
    expect(sourceMap).toEqual(dedent`
      src/src.ts:
        interface Interface1 {
          prop1: string;
          prop2: boolean;
          method1(param1: string): void;
          method2(param1: boolean): number;
        }
        function function1(param1: string): void;
        function function2(param1: boolean): number;
      
    `);
  });

  test("returns an empty string if no files are provided", () => {
    const sourceMap = generateMapFromFiles([]);
    expect(sourceMap).toEqual("");
  });
});
