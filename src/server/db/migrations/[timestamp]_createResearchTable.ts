import { change, type DbType, type Table } from "../dbScript";
import { ResearchAgentActionType } from "../../agent/research";

change(async (db) => {
  await db.createTable("research", (t: Table) => ({
    id: t.identity().primaryKey(),
    todoId: t.integer().foreignKey("todos", "id").onDelete("CASCADE") as any,
    issueId: t.integer(),
    type: t as any
      .enum(
        "research_agent_action_type",
        Object.values(ResearchAgentActionType) as [
          ResearchAgentActionType,
          ...ResearchAgentActionType[],
        ],
      ) as any
      .notNull(),
    question: t.text(),
    answer: t.text(),
    createdAt: t.timestamp().notNull().defaultNow() as any,
    updatedAt: t.timestamp().notNull().defaultNow() as any,
  }));
});
