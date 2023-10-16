import { orchidORM } from "orchid-orm";
import { config } from "./config";
import { ProjectsTable } from "./tables/projects.table";
import { TokensTable } from "./tables/tokens.table";

export const db = orchidORM(config.database, {
  projects: ProjectsTable,
  tokens: TokensTable,
});
