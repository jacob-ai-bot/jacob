import { BaseTable } from "../baseTable";
import { ResearchAgentActionType } from "~/types";

const RESEARCH_TYPE_VALUES = Object.values(ResearchAgentActionType) as [
  ResearchAgentActionType,
  ...ResearchAgentActionType[],
];

export class ResearchTable extends BaseTable {
  readonly table = "research";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    todoId: t.integer().foreignKey("todos", "id"),
    issueId: t.integer(),
    projectId: t.integer().foreignKey("projects", "id").nullable(),
    type: t.enum("research_type_values", RESEARCH_TYPE_VALUES),
    question: t.text(),
    answer: t.text(),
    ...t.timestamps(),
  }));
}
