import { rakeDb } from "rake-db";
import { appCodeUpdater } from "orchid-orm/codegen";
import { config } from "./config";
import { BaseTable } from "./baseTable";

export const change = rakeDb(config.allDatabases, {
  baseTable: BaseTable,
  migrationsPath: "./migrations",
  appCodeUpdater: appCodeUpdater({
    tablePath: (tableName) => `./tables/${tableName}.table.ts`,
    ormPath: "./db.ts",
  }),
  useCodeUpdater: true, // set to false to disable code updater
  commands: {
    async seed() {
      const { seed } = await import("./seed");
      await seed();
    },
  },
  import: (path) => import(path),
});
