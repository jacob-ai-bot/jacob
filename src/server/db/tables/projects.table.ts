import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";

export type Project = Selectable<ProjectsTable>;
export type NewProject = Insertable<ProjectsTable>;
export type ProjectUpdate = Updateable<ProjectsTable>;
export type ProjectQueryable = Queryable<ProjectsTable>;

export class ProjectsTable extends BaseTable {
  readonly table = "projects";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    repoId: t.bigint().unique(),
    repoNodeId: t.varchar(255).unique(),
    repoName: t.text(0, Infinity),
    repoFullName: t.text(0, Infinity).unique(),
    settings: t.json().default({}),
    buildStatus: t.boolean().nullable(),
    lastBuildAt: t.timestamp().nullable(),
    buildError: t.text(0, 65535).nullable(),
    jiraCloudId: t.text().nullable(),
    linearBoardId: t.text().nullable(),
    ...t.timestamps(),
  }));
}
