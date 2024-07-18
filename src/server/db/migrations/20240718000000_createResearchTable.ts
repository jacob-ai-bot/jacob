import { change } from "../dbScript";

const researchTypeValues = [
  "ResearchCodebase",
  "ResearchAgent",
  "AskProjectOwner",
  "ReasearchComplete",
] as [string, ...string[]];

change(async (db, up) => {
  if (up) {
    await db.createEnum("research_type", researchTypeValues);
  }

  await db.createTable("research", (t) => ({
    id: t.identity().primaryKey(),
    todoId: t.integer().foreignKey("todos", "id"),
    issueId: t.integer(),
    type: t.enum("research_type_values"),
    question: t.text(),
    answer: t.text(),
    ...t.timestamps(),
  }));

  if (!up) {
    await db.dropEnum("research_type", researchTypeValues);
  }
});
