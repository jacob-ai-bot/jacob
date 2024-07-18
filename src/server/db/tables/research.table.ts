import { BaseTable } from '../baseTable';
import { ResearchAgentActionType } from '../../agent/research';

export class ResearchTable extends BaseTable {
  readonly table = 'research';
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    todoId: t.integer().foreignKey('todos', 'id').onDelete('CASCADE'),
    issueId: t.integer(),
    type: t.enum(
      'research_agent_action_type',
      Object.values(ResearchAgentActionType)
    ),
    question: t.text(),
    answer: t.text(),
    ...t.timestamps(),
  }));
}