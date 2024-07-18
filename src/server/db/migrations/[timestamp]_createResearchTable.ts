import { change } from "../dbScript";
import { ResearchAgentActionType } from "../../agent/research";

change(async (db) => {
  await db.createTable("research", (t) => ({
    id: t.identity().primaryKey(),
    todoId: t.integer().foreignKey("todos", "id").onDelete("CASCADE"),
    issueId: t.integer(),
    type: t.enum(
      "research_agent_action_type",
      Object.values(ResearchAgentActionType)
    ),
    question: t.text(),
    answer: t.text(),
    ...t.timestamps(),
  }));
});