// src/tables/CodebaseContextTable.ts

import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";

export type CodebaseFile = Selectable<CodebaseContextTable>;
export type NewCodebaseFile = Insertable<CodebaseContextTable>;
export type CodebaseFileUpdate = Updateable<CodebaseContextTable>;
export type CodebaseFileQueryable = Queryable<CodebaseContextTable>;

export class CodebaseContextTable extends BaseTable {
  readonly table = "codebase_context";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    filePath: t.varchar(255),
    lastCommitHash: t.varchar(40),
    context: t.json((j) =>
      j.object({
        file: j.string(),
        code: j.array(j.string()),
        importStatements: j.array(j.string()),
        text: j.string(),
        diagram: j.string(),
        overview: j.string(),
        importedFiles: j.array(j.string()),
        exports: j.array(
          j.object({
            type: j.string().nullable().optional(),
            name: j.string(),
            exportType: j.string(),
            line_no: j.number(),
            code_referenced: j.string(),
            source: j.string().optional(),
          }),
        ),
        referencedImportDetails: j
          .array(
            j.object({
              name: j.string(),
              exportType: j.string(),
              line_no: j.number(),
              code_referenced: j.string(),
              source: j.string().optional(),
              overview: j.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
    ...t.timestamps(),
  }));
}
