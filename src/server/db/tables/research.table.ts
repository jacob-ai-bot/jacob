import { BaseTable } from "../baseTable";
import { ResearchAgentActionType } from "../../agent/research";

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
    type: t.enum("research_type_values", RESEARCH_TYPE_VALUES),
    question: t.text(),
    answer: t.text(),
    ...t.timestamps(),
  }));
}
