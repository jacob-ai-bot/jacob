import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import { TodoStatus } from "../enums";

const TODO_STATUS_VALUES = Object.values(TodoStatus) as [
  TodoStatus,
  ...TodoStatus[],
];

export type Todo = Selectable<TodosTable>;
export type NewTodo = Insertable<TodosTable>;
export type TodoUpdate = Updateable<TodosTable>;
export type TodoQueryable = Queryable<TodosTable>;

export class TodosTable extends BaseTable {
  readonly table = "todos";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    description: t.text(),
    name: t.text(),
    status: t.enum("todo_status", TODO_STATUS_VALUES),
    position: t.integer().default(0),
    issueId: t.integer().nullable(),
    branch: t.text().nullable(),
    evaluationData: t.json().nullable(),
    isArchived: t.boolean().default(false),
    jiraIssueId: t.text().nullable(),
    ...t.timestamps(),
  }));
}
