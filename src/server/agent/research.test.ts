// import { test, describe, beforeAll, afterAll } from "vitest";
// import { setupServer, type SetupServer } from "msw/node";
// import { HttpResponse, http } from "msw";
// import { researchIssue } from "./research"; // Adjust the import path

// const GITHUB_ISSUE =
//   "Currently we are creating a `research` string when a new Todo is created. Currently we're just saving that research as a string on the todo description. We need to update this to be more sophisticated. Here are some of the tasks:\r\n- Change research from a string to more structured data. Create a new Typescript interface for it called 'Research'. The main fields should be: \r\n  type: ResearchAgentActionType; // Type of research conducted\r\n  question: string; // The query or question asked\r\n  answer: string; // The response or answer obtained\r\n  issueId: string; // Reference to the GitHub issue this research is related to\r\n- Create a new `research` table in the database. Be sure to create a migration and be careful with that type enum. Look at other table creation migrations to see the right patterns. Include a todoId as the main foreign key that will link research to the specific todo item, and also add the issueId. If the parent todoId is deleted, delete all of the research items tied to that parent. \r\n- Update the code in the agent research (researchIssue function) to capture the data using this new format. Return the array of Research objects instead of the string. \r\n- Update the Todos to first check to see if any research has already been done for this issue. If it has, skip the research step. If not, do the research. Create the Todo first and then link the research to the todos using the todoId. \r\n- Add a function to the `research.ts` file to pass in an issue id (payload.issue.number) and get back an array of research items.\r\n- in the Code agentEditFile and agentFixError files, currently the research is set to an empty string. Update that to get the research from the db using the function you just created, and then turn it into a string of question / answers. This research var should already be used as needed in the rest of the codebase.";
// const SOURCE_MAP = `/tailwind.config.ts:
// /vitest.config.ts:
// /src/vite-env.d.ts:
// /src/app/error.tsx:
//   function Error({ error }: { error: Error; }): any;
// /src/app/layout.tsx:
//   function RootLayout({
//   children,
// }: ReactNode; }): any;
// /src/app/page.tsx:
//   function Home(): Promise<any>;
// /src/app/utils.test.ts:
// /src/app/utils.ts:
//   function removeMarkdownCodeblocks(text: string): string;
//   function getIssueDescriptionFromMessages(messages: Message[]): string | null | undefined;
// /src/data/developers.ts:
// /src/data/plans.ts:
// /src/data/tasks.ts:
// /src/images/Logo.tsx:
//   function Logo(props: ComponentProps<"svg">): any;
// /src/routes/GitHubOAuth.tsx:
//   function GitHubOAuth({ redirectURI }: { redirectURI: string; }): any;
// /src/server/auth.ts:
// /src/server/context.ts:
// /src/server/prodServer.cts:
// /src/server/wssDevServer.cts:
// /src/trpc/client.tsx:
//   function getBaseUrl(): string;
// /src/trpc/react.tsx:
//   function TRPCReactProvider(props: ReactNode; }): any;
//   function getBaseUrl(): string;
// /src/trpc/server.ts:
// /src/app/_components/Events.tsx:
//   function Events(): any;
// /src/app/_components/Repos.tsx:
//   function Repos(): any;
// /src/app/_components/SignInButton.tsx:
//   interface SignInButtonProps {
//     callbackUrl: string;
//   }
// /src/app/_components/SignOutButton.tsx:
//   interface SignOutButtonProps {
//     callbackUrl: string | undefined;
//   }
// /src/app/dashboard/loading.tsx:
// /src/app/dashboard/page.tsx:
// /src/server/__tests__/utils.parse_template.test.ts:
// /src/server/agent/bugfix.ts:
//   function applyAndEvaluateFix(agent: BugAgent, fix: string, projectContext: ProjectContext, allErrors: ErrorInfo[]): Promise<{ success: boolean; buildOutput: string; resolvedErrors: ErrorInfo[]; }>;
//   function assessAndInstallNpmPackages(buildErrors: string, projectContext: ProjectContext): Promise<boolean>;
//   function fixError(projectContext: ProjectContext): Promise<string[]>;
//   function parseBuildErrors(buildOutput: string): Promise<ErrorInfo[]>;
//   function createBugAgents(buildErrors: string): Promise<BugAgent[]>;
//   function generatePotentialFixes(agent: BugAgent, projectContext: ProjectContext): Promise<string[]>;
// /src/server/agent/files.ts:
// /src/server/agent/plan.ts:
//   interface PlanStep {
//     type: PlanningAgentActionType;
//     title: string;
//     instructions: string;
//     filePath: string;
//     exitCriteria: string;
//     dependencies: string | undefined;
//   }
//   interface Plan {
//     steps: PlanStep[];
//   }
// /src/server/agent/research.ts:
//   function callFunction(functionName: ResearchAgentActionType, args: { query: string; }, githubIssue: string, sourceMap: string, rootDir: string): Promise<string>;
//   function researchCodebase(query: string, githubIssue: string, sourceMap: string, rootDir: string): Promise<string>;
//   function researchInternet(query: string): Promise<string>;
// /src/server/analytics/posthog.ts:
// /src/server/analyze/sourceMap.test.ts:
// /src/server/analyze/sourceMap.ts:
//   function getImageFiles(dirPath: string, imageExtensions: string[]): Promise<string[]>;
//   function cleanType(rootPath: string, type: string): string;
// /src/server/analyze/traverse.test.ts:
// /src/server/analyze/traverse.ts:
//   function traverseCodebase(rootPath: string): string[];
//   function isRelevantFile(filePath: string): boolean;
// /src/server/api/issues.ts:
//   interface QueryParams {
//     repo: string | undefined;
//     issues: string | undefined;
//   }
//   function getExtractedIssues(req: Request, res: Response): Promise<any>;
// /src/server/api/repos.ts:
//   function getRepos(req: Request, res: Response): Promise<any>;
// /src/server/api/root.ts:
// /src/server/api/trpc.ts:
// /src/server/api/utils.ts:
// /src/server/code/agentEditFiles.ts:
//   interface EditFilesParams {
//     repository: Repository;
//     token: string;
//     issue: Issue;
//     rootPath: string;
//     sourceMap: string;
//     repoSettings: RepoSettings | undefined;
//   }
//   interface FileContent {
//     fileName: string;
//     filePath: string;
//     codeBlock: string;
//   }
//   function agentEditFiles(params: EditFilesParams): Promise<void>;
//   function applyCodePatch(rootPath: string, filePath: string, patch: string, isNewFile: boolean): Promise<FileContent[]>;
//   function createNewFile(rootPath: string, filePath: string, patch: string): Promise<FileContent[]>;
//   function updateExistingFile(rootPath: string, filePath: string, patch: string): Promise<FileContent[]>;
// /src/server/code/agentFixError.ts:
//   interface AgentFixErrorParams {
//     repository: Repository;
//     token: string;
//     prIssue: any;
//     body: string | null;
//     rootPath: string;
//     branch: string;
//     existingPr: Endpoints;
//     repoSettings: RepoSettings | undefined;
//   }
//   function agentFixError(params: AgentFixErrorParams): Promise<string[]>;
// /src/server/code/assessBuildError.ts:
//   interface AssessBuildErrorParams {
//     sourceMap: string;
//     errors: string;
//   }
//   function assessBuildError(params: AssessBuildErrorParams): Promise<z.infer<any>>;
// /src/server/code/checkAndCommit.test.ts:
// /src/server/code/checkAndCommit.ts:
//   interface CheckAndCommitOptions {
//     repository: Repository;
//     token: string;
//     rootPath: string;
//     branch: string;
//     repoSettings: RepoSettings | undefined;
//     commitMessage: string;
//     issue: any;
//     existingPr: any;
//     newPrTitle: string | undefined;
//     newPrBody: string | undefined;
//     newPrReviewers: string[] | undefined;
//     creatingStory: boolean | undefined;
//     buildErrorAttemptNumber: number | undefined;
//   }
//   function checkAndCommit({
//   repository,
//   token,
//   rootPath,
//   branch,
//   repoSettings,
//   commitMessage,
//   issue: actingOnIssue,
//   existingPr,
//   newPrTitle,
//   newPrBody,
//   newPrReviewers,
//   creatingStory,
//   buildErrorAttemptNumber,
//   ...baseEventData
// }: CheckAndCommitOptions): Promise<void>;
// /src/server/code/codeReview.test.ts:
// /src/server/code/codeReview.ts:
//   interface CodeReviewParams {
//     repository: Repository;
//     token: string;
//     rootPath: string;
//     branch: string;
//     repoSettings: RepoSettings | undefined;
//     existingPr: Endpoints;
//   }
//   function codeReview(params: CodeReviewParams): Promise<void>;
// /src/server/code/createStory.test.ts:
// /src/server/code/createStory.ts:
//   interface CreateStoryParams {
//     repository: Repository;
//     token: string;
//     rootPath: string;
//     branch: string;
//     repoSettings: RepoSettings | undefined;
//     existingPr: Endpoints;
//   }
//   function createStory(params: CreateStoryParams): Promise<void>;
// /src/server/code/editFiles.ts:
//   interface EditFilesParams {
//     repository: Repository;
//     token: string;
//     issue: Issue;
//     rootPath: string;
//     sourceMap: string;
//     repoSettings: RepoSettings | undefined;
//   }
//   function editFiles(params: EditFilesParams): Promise<void>;
// /src/server/code/extractedIssue.ts:
// /src/server/code/fixError.test.ts:
// /src/server/code/fixError.ts:
//   interface FixErrorParams {
//     repository: Repository;
//     token: string;
//     prIssue: any;
//     body: string | null;
//     rootPath: string;
//     branch: string;
//     existingPr: Endpoints;
//     repoSettings: RepoSettings | undefined;
//   }
//   function fixError(params: FixErrorParams): Promise<void>;
// /src/server/code/newFile.ts:
//   interface CreateNewFileParams {
//     newFileName: string;
//     repository: Repository;
//     token: string;
//     issue: Issue;
//     rootPath: string;
//     sourceMap: string;
//     repoSettings: RepoSettings | undefined;
//   }
//   function createNewFile(params: CreateNewFileParams): Promise<void>;
// /src/server/code/respondToCodeReview.ts:
//   interface RespondToCodeReviewParams {
//     repository: Repository;
//     token: string;
//     rootPath: string;
//     repoSettings: RepoSettings | undefined;
//     branch: string;
//     existingPr: Endpoints;
//     state: "changes_requested" | "commented";
//     reviewId: number;
//     reviewBody: string | null;
//   }
//   function respondToCodeReview(params: RespondToCodeReviewParams): Promise<void>;
// /src/server/db/baseTable.ts:
// /src/server/db/config.ts:
// /src/server/db/db.ts:
// /src/server/db/dbScript.ts:
// /src/server/db/enums.ts:
// /src/server/db/seed.ts:
// /src/server/git/branch.ts:
//   interface SetNewBranchParams {
//     rootPath: string;
//     branchName: string;
//   }
//   function setNewBranch({
//   rootPath,
//   branchName,
//   ...baseEventData
// }: SetNewBranchParams): Promise<{ stdout: any; stderr: any; } | undefined>;
// /src/server/git/clone.test.ts:
// /src/server/git/clone.ts:
//   interface CloneRepoParams {
//     repoName: string;
//     branch: string | undefined;
//     token: string | undefined;
//     baseEventData: BaseEventData | undefined;
//   }
//   function cloneRepo({
//   repoName,
//   branch,
//   token,
//   baseEventData,
// }: CloneRepoParams): Promise<DirectoryResult>;
// /src/server/git/commit.test.ts:
// /src/server/git/commit.ts:
//   interface AddCommitAndPushParams {
//     rootPath: string;
//     branchName: string;
//     commitMessage: string;
//     token: string;
//   }
//   function addCommitAndPush({
//   rootPath,
//   branchName,
//   commitMessage,
//   token,
//   ...baseEventData
// }: AddCommitAndPushParams): Promise<{ stdout: any; stderr: any; } | undefined>;
// /src/server/git/operations.test.ts:
// /src/server/git/operations.ts:
//   interface GitOperationParams {
//     directory: string;
//     token: string | undefined;
//     baseEventData: BaseEventData | undefined;
//   }
//   function executeGitCommand(command: string, { directory, token, baseEventData }: GitOperationParams): Promise<void>;
//   function gitStageChanges(params: GitOperationParams): Promise<void>;
//   function gitCommit(message: string, params: GitOperationParams): Promise<string | null>;
//   function gitDeleteBranch(branchName: string, gitParams: GitOperationParams): Promise<void>;
//   function mergeFixToBranch(fixBranch: string, targetBranch: string, gitParams: GitOperationParams): Promise<void>;
//   function gitCheckout(branchName: string, params: GitOperationParams & { newBranch?: boolean | undefined; }): Promise<void>;
//   function gitBranch(branchName: string, params: GitOperationParams): Promise<void>;
//   function gitPush(branchName: string, params: GitOperationParams): Promise<void>;
//   function gitPull(params: GitOperationParams): Promise<void>;
//   function gitReset(mode: "soft" | "mixed" | "hard", commit: string, params: GitOperationParams): Promise<void>;
//   function getCurrentCommitHash(params: GitOperationParams): Promise<string>;
//   function checkForChanges(params: GitOperationParams): Promise<boolean>;
//   function commitChangesToBaseBranch(projectContext: ProjectContext): Promise<void>;
//   function gitStash(gitParams: GitOperationParams): Promise<void>;
//   function gitStashPop(gitParams: GitOperationParams): Promise<void>;
// /src/server/github/comments.ts:
//   interface AddStartingWorkCommentBaseParams {
//     repository: Repository;
//     token: string;
//   }
//   interface AddStartingWorkCommentIssueOpenedParams {
//     task: "issueOpened";
//     issueNumber: number;
//   }
//   interface AddStartingWorkCommentPRReviewParams {
//     task: "prReview";
//     prNumber: number;
//   }
//   interface AddStartingWorkCommentPRCommandParams {
//     task: "prCommand";
//     prNumber: number;
//     prCommand: PRCommand;
//   }
//   interface AddStartingWorkCommentIssueCommandParams {
//     task: "issueCommand";
//     issueCommand: IssueCommand;
//     issueNumber: number;
//   }
//   function addStartingWorkComment(options: AddStartingWorkCommentParams): any;
//   function addFailedWorkComment(repository: Repository, issueOrPRNumber: number, token: string, issueOpened: boolean, prReview: boolean, error: Error): any;
//   function addUnsupportedCommandComment(repository: Repository, issueOrPRNumber: number, token: string): any;
// /src/server/github/issue.ts:
//   interface SimpleRepository {
//     owner: SimpleOwner;
//     name: string;
//   }
//   function addCommentToIssue(repository: Repository, issueOrPRNumber: number, token: string, body: string): any;
//   function getIssue(repository: SimpleRepository, token: string, issue_number: number): Promise<any>;
//   function createRepoInstalledIssue(repository: Pick<Repository, "owner" | "name">, token: string, assignee: string | undefined, isNodeRepo: boolean | undefined, error: Error | undefined): Promise<any>;
// /src/server/github/pr.ts:
//   interface ErrorWithStatus {
//     status: number;
//   }
//   function isErrorWithStatus(error: unknown): boolean;
//   function createPR(repository: Repository, token: string, newBranch: string, title: string, body: string, reviewers: string[], draft: boolean | undefined): Promise<any>;
//   function createPRReview({
//   repository,
//   token,
//   pull_number,
//   body,
//   comments,
//   commit_id,
//   event,
// }: { repository: Repository; token: string; pull_number: number; body?: string | undefined; comments?: any; commit_id?: string | undefined; event?: any; }): Promise<any>;
//   function getPR(repository: Repository, token: string, pull_number: number): Promise<any>;
//   function getPRDiff(repository: Repository, token: string, pull_number: number): Promise<OctokitResponse<string>>;
//   function getPRFiles(repository: Repository, token: string, pull_number: number): Promise<any>;
//   function markPRReadyForReview(token: string, pullRequestId: string): Promise<any>;
//   function getPRReviewComments(repository: Repository, token: string, prNumber: number, reviewId: number): Promise<any>;
//   function concatenatePRFiles(rootPath: string, repository: Repository, token: string, prNumber: number, newOrModifiedRangeMap: FilesRangesMap | undefined, fileNamesToInclude: string[] | undefined, fileNamesToCreate: string[] | null | undefined): Promise<{ code: string; lineLengthMap: LineLengthMap; }>;
// /src/server/github/repo.ts:
//   function getFile(repository: Pick<Repository, "owner" | "name">, token: string, path: string): Promise<any>;
// /src/server/image/upload.ts:
//   interface Body {
//     image: unknown;
//     imageType: string | undefined;
//     imageName: string | undefined;
//     shouldResize: boolean | undefined;
//   }
//   function uploadImage(req: Request, res: Response): Promise<any>;
// /src/server/messaging/listener.ts:
// /src/server/messaging/queue.test.ts:
// /src/server/messaging/queue.ts:
//   function initRabbitMQ({ listener }: { listener: boolean; }): Promise<void>;
//   function addProjectToDB(repository: Pick<Repository, "id" | "name" | "node_id" | "full_name">, eventId: string, eventName: string): Promise<any>;
//   function isNodeProject(repository: Pick<Repository, "id" | "owner" | "name" | "node_id" | "full_name" | "private">, installationAuthentication: InstallationAccessTokenAuthentication): Promise<boolean>;
//   function authInstallation(installationId: number | undefined): Promise<any>;
//   function onReposAdded(event: any): Promise<void>;
//   function onGitHubEvent(event: any): Promise<void>;
// /src/server/openai/request.ts:
// /src/server/openai/utils.ts:
// /src/server/utils/dynamicImport.ts:
//   function dynamicImport(specifier: string): Promise<any>;
// /src/server/utils/events.test.ts:
// /src/server/utils/events.ts:
//   interface EmitCodeEventParams {
//     fileName: string;
//     filePath: string;
//     codeBlock: string;
//   }
//   interface EmitPREventParams {
//     pullRequest: Endpoints;
//   }
//   interface EmitPlanEventParams {
//     plan: Plan;
//   }
//   interface EmitPlanStepEventParams {
//     planStep: PlanStep;
//   }
//   interface EmitTaskEventParams {
//     issue: any;
//     subType: TaskSubType;
//     status: TaskStatus;
//     statusMessage: string | undefined;
//   }
//   interface EmitCommandEventParams {
//     command: string;
//     directory: string;
//     response: string;
//     exitCode: number | null;
//   }
//   interface EmitPromptEventParams {
//     tokens: number;
//     model: string;
//     cost: number;
//     duration: number;
//     requestPrompts: { promptType: "Assistant" | "User" | "System"; prompt: string; }[];
//     responsePrompt: string;
//   }
//   function purgeEvents(): any;
//   function emitCodeEvent(params: EmitCodeEventParams): Promise<void>;
//   function emitPREvent(params: EmitPREventParams): Promise<void>;
//   function emitPlanEvent(params: EmitPlanEventParams): Promise<void>;
//   function emitPlanStepEvent(params: EmitPlanStepEventParams): Promise<void>;
//   function emitTaskEvent(params: EmitTaskEventParams): Promise<void>;
//   function emitCommandEvent(params: EmitCommandEventParams): Promise<void>;
//   function emitPromptEvent(params: EmitPromptEventParams): Promise<void>;
// /src/server/utils/files.test.ts:
// /src/server/utils/files.ts:
//   interface NewOrModifiedRange {
//     start: number;
//     end: number;
//   }
//   interface CodeComment {
//     path: string;
//     body: string;
//     line: number;
//   }
//   function getNewOrModifiedRangesMapFromDiff(diff: string): FilesRangesMap;
//   function applyCodePatch(rootPath: string, patch: string): Promise<void>;
// /src/server/utils/images.test.ts:
// /src/server/utils/images.ts:
// /src/server/utils/index.test.ts:
// /src/server/utils/index.ts:
//   interface BaseEventData {
//     projectId: number;
//     repoFullName: string;
//     userId: string;
//     issueId: number | undefined;
//   }
//   interface ExecAsyncException {
//     stdout: string;
//     stderr: string;
//   }
//   interface PromiseWithChildAndResponse {
//     response: string;
//   }
//   interface ExecuteWithLogRequiringSuccessWithoutEventParams {
//     directory: string;
//     command: string;
//     options: any;
//   }
//   function constructNewOrEditSystemPrompt(action: string, templateParams: TemplateParams, repoSettings: RepoSettings | undefined): any;
//   function execAsyncWithLog(command: string, options: any): PromiseWithChildAndResponse<{ stdout: Buffer; stderr: Buffer; }>;
//   function getSanitizedEnv(): any;
//   function generateJacobBranchName(issueNumber: number): string;
//   function extractIssueNumberFromBranchName(branch: string): number | undefined;
//   function executeWithLogRequiringSuccessWithoutEvent({
//   directory,
//   command,
//   options,
// }: ExecuteWithLogRequiringSuccessWithoutEventParams): ExecPromise;
//   function executeWithLogRequiringSuccess({
//   directory,
//   command,
//   options,
//   ...baseEventData
// }: ExecuteWithLogRequiringSuccessParams): ExecPromise;
//   function enumFromStringValue(enm: Record<string, T>, value: string | undefined): T | undefined;
//   function getStyles(rootPath: string, repoSettings: RepoSettings | undefined): Promise<any>;
//   function getLanguageFromFileName(filePath: string): Language | undefined;
//   function rethrowErrorWithTokenRedacted(error: unknown, token: string): void;
// /src/server/utils/redis.ts:
//   function newRedisConnection(): any;
// /src/server/utils/settings.test.ts:
// /src/server/utils/settings.ts:
//   interface RepoSettings {
//     language: Language;
//     style: Style | undefined;
//     installCommand: string | undefined;
//     formatCommand: string | undefined;
//     buildCommand: string | undefined;
//     testCommand: string | undefined;
//     iconSet: IconSet | undefined;
//     componentExamples: string | undefined;
//     apiEndpointsExamples: string | undefined;
//     pageExamples: string | undefined;
//     directories: { components?: string | undefined; pages?: string | undefined; styles?: string | undefined; staticAssets?: string | undefined; tailwindConfig?: string | undefined; } | undefined;
//     stateManagement: { tool?: string | undefined; } | undefined;
//     testing: { writeTests?: boolean | undefined; } | undefined;
//     storybook: { writeStories?: boolean | undefined; storiesLocation?: string | undefined; } | undefined;
//     envVariables: { exampleFile?: string | undefined; } | undefined;
//     env: Record<string, string> | undefined;
//     packageDependencies: Record<string, string> | undefined;
//   }
//   function getRepoSettings(rootPath: string): RepoSettings;
// /src/server/utils/testHelpers.ts:
//   function createMockNextRequest(reqOptions: any): NextRequest;
// /src/server/utils/todos.ts:
// /src/server/utils/tokens.test.ts:
// /src/server/utils/tokens.ts:
//   function purgeTokens(): any;
// /src/server/webhooks/github.ts:
// /src/app/api/chat/chat_prompts.ts:
// /src/app/api/chat/route.ts:
//   function POST(req: NextRequest): Promise<Response>;
// /src/app/api/dashboard/route.ts:
//   function GET(request: NextRequest): Promise<any>;
// /src/app/auth/github/page.tsx:
//   function GitHubOAuthPage(): any;
// /src/app/auth/signin/page.tsx:
//   function SignIn({ searchParams }: Props): Promise<any>;
// /src/server/api/routers/events.ts:
//   interface Task {
//     issueId: number;
//     imageUrl: string | undefined;
//     currentPlanStep: number | undefined;
//     statusDescription: string | undefined;
//     plan: Plan[] | undefined;
//     issue: Issue | undefined;
//     pullRequest: PullRequest | undefined;
//     commands: Command[] | undefined;
//     codeFiles: Code[] | undefined;
//     prompts: Prompt[] | undefined;
//   }
//   interface Todo {
//     id: number;
//     projectId: number;
//     description: string;
//     name: string;
//     status: TodoStatus;
//     position: number;
//     issueId: number | null | undefined;
//     branch: string | null | undefined;
//     isArchived: boolean;
//   }
// /src/server/api/routers/github.ts:
// /src/server/api/routers/todos.ts:
// /src/server/build/node/check.test.ts:
// /src/server/build/node/check.ts:
//   interface RunBuildCheckParams {
//     path: string;
//     afterModifications: boolean;
//     repoSettings: RepoSettings | undefined;
//   }
//   interface RunNpmInstallParams {
//     path: string;
//     packageName: string;
//     repoSettings: RepoSettings | undefined;
//   }
//   function getEnv(repoSettings: RepoSettings | undefined): NodeJS.ProcessEnv;
//   function runBuildCheck({
//   path,
//   afterModifications,
//   repoSettings,
//   ...baseEventData
// }: RunBuildCheckParams): ExecPromise;
//   function runNpmInstall({
//   path,
//   packageName,
//   repoSettings,
//   ...baseEventData
// }: RunNpmInstallParams): Promise<{ stdout: any; stderr: any; }>;
// /src/server/db/migrations/20230925215414_createProjects.ts:
// /src/server/db/migrations/20231016021619_addTokenTable.ts:
// /src/server/db/migrations/20240429195703_createEventsTable.ts:
// /src/server/db/migrations/20240506232702_makeEventsIssueIdNullable.ts:
// /src/server/db/migrations/20240515225440_addPullRequestIdToEvents.ts:
// /src/server/db/migrations/20240604211756_add_todos_table.ts:
// /src/server/db/migrations/20240611212907_createAuthTables.ts:
// /src/server/db/migrations/20240612230541_createOnboardingStatusEnum.ts:
// /src/server/db/migrations/20240612230542_addOnboardingStatusToUsers.ts:
// /src/server/db/migrations/20240629151353_addPlanStepTaskType.ts:
// /src/server/db/tables/accounts.table.ts:
// /src/server/db/tables/events.table.ts:
// /src/server/db/tables/projects.table.ts:
// /src/server/db/tables/todos.table.ts:
// /src/server/db/tables/tokens.table.ts:
// /src/server/db/tables/users.table.ts:
// /src/app/api/auth/[...nextauth]/route.ts:
// /src/app/api/auth/accessToken/route.ts:
//   function POST(): Promise<any>;
// /src/app/api/design/[verb]/route.test.ts:
// /src/app/api/design/[verb]/route.ts:
//   interface Params {
//     verb: string;
//   }
//   function generatePreferredFileName(specifiedFileName: string | undefined, fileName: string, newFileType: string | undefined, nextAppRouter: boolean): string;
// /src/app/api/github/webhooks/route.ts:
// /src/app/api/image/upload/route.ts:
//   interface Body {
//     image: unknown;
//     imageType: string | undefined;
//     imageName: string | undefined;
//     shouldResize: boolean | undefined;
//   }
//   function POST(req: NextRequest): Promise<any>;
// /src/app/api/trpc/[trpc]/route.ts:
// /src/app/dashboard/[org]/[repo]/page.tsx:
// /src/app/api/auth/accessToken/[key]/route.ts:
//   interface Params {
//     key: string;
//   }
//   function GET(_req: NextRequest, { params }: { params: Params; }): Promise<any>;
//   function POST(req: NextRequest, { params }: { params: Params; }): Promise<any>;
// /src/app/api/auth/github/callback/route.ts:
//   function GET(req: NextRequest): Promise<any>;
// /src/app/dashboard/[org]/[repo]/[developer]/Dashboard.tsx:
//   interface DashboardParams {
//     org: string;
//     repo: string;
//     developerId: string;
//     project: Selectable<ProjectsTable>;
//     sourceMap: string;
//     tasks: Task[];
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/page.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/Sidebar.tsx:
//   interface SidebarProps {
//     selectedIcon: SidebarIcon;
//     onIconClick: (icon: SidebarIcon) => void;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx:
//   interface Props {
//     messages: Message[];
//     loading: boolean;
//     onSend: (message: Message) => void;
//     onReset: () => void;
//     onCreateNewTask: (messages: Message[]) => void;
//     onUpdateIssue: (messages: Message[]) => void;
//     isResponding: boolean | undefined;
//     shouldHideLogo: boolean | undefined;
//     messagesEndRef: React.RefObject<HTMLDivElement>;
//     sidebarRef: React.RefObject<HTMLDivElement>;
//     checkIfAtBottom: () => void;
//     scrollToBottom: () => void;
//     isAtBottom: boolean;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatHeader.tsx:
//   interface ChatHeaderProps {
//     shouldHideLogo: boolean | undefined;
//     selectedRepo: string | undefined;
//     selectedDeveloper: Developer | undefined;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatInput.tsx:
//   interface Props {
//     onSend: (message: Message) => void;
//     isResponding: boolean | undefined;
//     loading: boolean | undefined;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatLoader.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatMessage.tsx:
//   interface Props {
//     message: Message;
//     messageHistory: Message[];
//     onCreateNewTask: (messages: Message[]) => void;
//     onUpdateIssue: (messages: Message[]) => void;
//     loading: boolean | undefined;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/chat/index.tsx:
//   interface ChatComponentHandle {
//     handleChat: (message: Message) => void;
//     resetChat: (messages?: Message[] | undefined) => void;
//     setLoading: (isLoading: boolean) => void;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/developers/DeveloperCard.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/developers/index.tsx:
//   interface DevelopersGridProps {
//     org: string;
//     repo: string;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/todos/DetailedTodoCard.tsx:
//   interface Props {
//     todo: Todo;
//     onEdit: ((todoId: number, newName: string) => void) | undefined;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/todos/Droppable.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/todos/index.tsx:
//   interface TodosProps {
//     todos: Todo[];
//     updateTodoPositions: (ids: number[]) => Promise<void>;
//     isLoading: boolean | undefined;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/todos/TodoCard.tsx:
//   interface Props {
//     todo: Todo;
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/todos/TodoStatus.tsx:
//   interface TodoStatusProps {
//     todos: Todo[];
//   }
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Code.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Design.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/index.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Issue.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Plan.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Prompts.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/PullRequest.tsx:
// /src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Terminal.tsx:
//   interface ConverterOptions {
//     fg: string | undefined;
//     bg: string | undefined;
//     newline: boolean | undefined;
//     escapeXML: boolean | undefined;
//     stream: boolean | undefined;
//     colors: string[] | Record<number, string> | undefined;
//   }
// next.config.js:
// prettier.config.js:
// src/app/_components/Events.tsx:
// src/app/_components/Repos.tsx:
// src/app/_components/SignInButton.tsx:
// src/app/_components/SignOutButton.tsx:
// src/app/api/auth/[...nextauth]/route.ts:
// src/app/api/auth/accessToken/[key]/route.ts:
// src/app/api/auth/accessToken/route.ts:
// src/app/api/auth/github/callback/route.ts:
// src/app/api/chat/chat_prompts.ts:
// src/app/api/chat/route.ts:
// src/app/api/dashboard/route.ts:
// src/app/api/design/[verb]/route.test.ts:
// src/app/api/design/[verb]/route.ts:
// src/app/api/github/webhooks/route.ts:
// src/app/api/image/upload/route.ts:
// src/app/api/trpc/[trpc]/route.ts:
// src/app/auth/github/page.tsx:
// src/app/auth/signin/page.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/Dashboard.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/Sidebar.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatHeader.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatInput.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatLoader.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/ChatMessage.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/chat/index.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/developers/DeveloperCard.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/developers/index.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/todos/DetailedTodoCard.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/todos/Droppable.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/todos/TodoCard.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/todos/TodoStatus.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/todos/index.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Code.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Design.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Issue.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Plan.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Prompts.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/PullRequest.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/Terminal.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/components/workspace/index.tsx:
// src/app/dashboard/[org]/[repo]/[developer]/page.tsx:
// src/app/dashboard/[org]/[repo]/page.tsx:
// src/app/dashboard/loading.tsx:
// src/app/dashboard/page.tsx:
// src/app/error.tsx:
// src/app/layout.tsx:
// src/app/page.tsx:
// src/app/utils.test.ts:
// src/app/utils.ts:
// src/data/developers.ts:
// src/data/plans.ts:
// src/data/tasks.ts:
// src/env.js:
// src/images/Logo.tsx:
// src/routes/GitHubOAuth.tsx:
// src/server/__tests__/utils.parse_template.test.ts:
// src/server/agent/bugfix.ts:
// src/server/agent/files.ts:
// src/server/agent/plan.ts:
// src/server/agent/research.ts:
// src/server/analytics/posthog.ts:
// src/server/analyze/sourceMap.test.ts:
// src/server/analyze/sourceMap.ts:
// src/server/analyze/traverse.test.ts:
// src/server/analyze/traverse.ts:
// src/server/api/issues.ts:
// src/server/api/repos.ts:
// src/server/api/root.ts:
// src/server/api/routers/events.ts:
// src/server/api/routers/github.ts:
// src/server/api/routers/todos.ts:
// src/server/api/trpc.ts:
// src/server/api/utils.ts:
// src/server/auth.ts:
// src/server/build/node/check.test.ts:
// src/server/build/node/check.ts:
// src/server/code/agentEditFiles.ts:
// src/server/code/agentFixError.ts:
// src/server/code/assessBuildError.ts:
// src/server/code/checkAndCommit.test.ts:
// src/server/code/checkAndCommit.ts:
// src/server/code/codeReview.test.ts:
// src/server/code/codeReview.ts:
// src/server/code/createStory.test.ts:
// src/server/code/createStory.ts:
// src/server/code/editFiles.ts:
// src/server/code/extractedIssue.ts:
// src/server/code/fixError.test.ts:
// src/server/code/fixError.ts:
// src/server/code/newFile.ts:
// src/server/code/respondToCodeReview.ts:
// src/server/context.ts:
// src/server/db/baseTable.ts:
// src/server/db/config.ts:
// src/server/db/db.ts:
// src/server/db/dbScript.ts:
// src/server/db/enums.ts:
// src/server/db/migrations/20230925215414_createProjects.ts:
// src/server/db/migrations/20231016021619_addTokenTable.ts:
// src/server/db/migrations/20240429195703_createEventsTable.ts:
// src/server/db/migrations/20240506232702_makeEventsIssueIdNullable.ts:
// src/server/db/migrations/20240515225440_addPullRequestIdToEvents.ts:
// src/server/db/migrations/20240604211756_add_todos_table.ts:
// src/server/db/migrations/20240611212907_createAuthTables.ts:
// src/server/db/migrations/20240612230541_createOnboardingStatusEnum.ts:
// src/server/db/migrations/20240612230542_addOnboardingStatusToUsers.ts:
// src/server/db/migrations/20240629151353_addPlanStepTaskType.ts:
// src/server/db/seed.ts:
// src/server/db/tables/accounts.table.ts:
// src/server/db/tables/events.table.ts:
// src/server/db/tables/projects.table.ts:
// src/server/db/tables/todos.table.ts:
// src/server/db/tables/tokens.table.ts:
// src/server/db/tables/users.table.ts:
// src/server/git/branch.ts:
// src/server/git/clone.test.ts:
// src/server/git/clone.ts:
// src/server/git/commit.test.ts:
// src/server/git/commit.ts:
// src/server/git/operations.test.ts:
// src/server/git/operations.ts:
// src/server/github/comments.ts:
// src/server/github/issue.ts:
// src/server/github/pr.ts:
// src/server/github/repo.ts:
// src/server/image/upload.ts:
// src/server/messaging/listener.ts:
// src/server/messaging/queue.test.ts:
// src/server/messaging/queue.ts:
// src/server/openai/request.ts:
// src/server/openai/utils.ts:
// src/server/utils/dynamicImport.ts:
// src/server/utils/events.test.ts:
// src/server/utils/events.ts:
// src/server/utils/files.test.ts:
// src/server/utils/files.ts:
// src/server/utils/images.test.ts:
// src/server/utils/images.ts:
// src/server/utils/index.test.ts:
// src/server/utils/index.ts:
// src/server/utils/redis.ts:
// src/server/utils/settings.test.ts:
// src/server/utils/settings.ts:
// src/server/utils/testHelpers.ts:
// src/server/utils/todos.ts:
// src/server/utils/tokens.test.ts:
// src/server/utils/tokens.ts:
// src/server/webhooks/github.ts:
// src/trpc/client.tsx:
// src/trpc/react.tsx:
// src/trpc/server.ts:
// src/types.ts:
// src/vite-env.d.ts:
// tailwind.config.ts:
// vitest.config.ts:
// `;
// const ROOT_DIR = "/Users/kleneway/Projects/kleneway-jacob";

// describe("researchIssue function", () => {
//   let server: SetupServer | undefined;

//   beforeAll(() => {
//     server = setupServer(
//       http.post(
//         "https://api.github.com/app/installations/42293588/access_tokens",
//         () => HttpResponse.json({}),
//       ),
//     );
//     server.listen({ onUnhandledRequest: "bypass" }); // Allows unhandled requests to go to the actual server
//   });

//   afterAll(() => {
//     server?.close();
//   });

//   test(
//     "should handle research issue",
//     async () => {
//       const result = await researchIssue(GITHUB_ISSUE, SOURCE_MAP, ROOT_DIR);

//       // Add your assertions here, for example:
//       console.log(result); // or use an appropriate assertion
//     },
//     { timeout: 1800000 }, // 30 minutes timeout
//   );
// });
