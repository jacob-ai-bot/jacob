import { orchidORM } from "orchid-orm";
import { config } from "./config";
import { ProjectsTable } from "./tables/projects.table";
import { TokensTable } from "./tables/tokens.table";
import { EventsTable } from "./tables/events.table";
import { TodosTable } from "./tables/todos.table";
import { UsersTable } from "./tables/users.table";
import { AccountsTable } from "./tables/accounts.table";
import { ResearchTable } from "./tables/research.table";
import { CodebaseContextTable } from "./tables/codebaseContext.table";
import { PlanStepsTable } from "./tables/planSteps.table";
import { IssuesTable } from "./tables/issues.table";
import { IssueBoardsTable } from "./tables/issueBoards.table";
import { WebhooksTable } from "./tables/webhooks.table";

export const db = orchidORM(config.database, {
  projects: ProjectsTable,
  tokens: TokensTable,
  events: EventsTable,
  todos: TodosTable,
  users: UsersTable,
  accounts: AccountsTable,
  research: ResearchTable,
  codebaseContext: CodebaseContextTable,
  planSteps: PlanStepsTable,
  issues: IssuesTable,
  issueBoards: IssueBoardsTable,
  webhooks: WebhooksTable,
});
