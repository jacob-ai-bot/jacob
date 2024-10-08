import { createTable } from "orchid-orm-schema-to-zod";

export const up = createTable("plan_steps", (t) => ({
  id: t
    .uuid()
    .primaryKey()
    .default(t.sql`gen_random_uuid()`),
  projectId: t.uuid().notNull().references("projects", "id"),
  issueNumber: t.integer().notNull(),
  stepNumber: t.integer().notNull(),
  details: t.text().notNull(),
  filePath: t.text().notNull(),
  isActive: t.boolean().default(true),
  createdAt: t.timestamp().default(t.sql`CURRENT_TIMESTAMP`),
  updatedAt: t.timestamp().default(t.sql`CURRENT_TIMESTAMP`),
}));

export const down = createTable("plan_steps", (t) => ({
  drop: true,
}));
