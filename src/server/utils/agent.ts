import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "Research Codebase",
      description: "Analyze the existing codebase for relevant information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to search within the codebase.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "Research Internet",
      description:
        "Search the internet for specific details if there are unique aspects that need further understanding.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to search on the internet.",
          },
        },
        required: ["query"],
      },
    },
  },
];

export const askGptIssueDetails = async function (
  githubIssue: string,
  sourceMap: string,
  previousInformationGathered: string[],
  maxLoops = 5,
): Promise<void> {
  const context: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant." },
  ];

  const initialPrompt = `
You are an AI coding assistant tasked with addressing a specific GitHub issue for a codebase. Your first step is to gather all necessary information to fully understand the issue and its context. Your goal is to identify all missing information and determine the best way to obtain it using the following actions:

1. **Research Codebase:** Analyze the existing codebase for relevant information.
2. **Research Internet:** Search the internet for specific details if there are unique aspects that need further understanding.

### GitHub Issue Details:
- **Issue:** ${githubIssue}
- **Source Map:** ${sourceMap}

### Previous Information Gathered:
${previousInformationGathered.join("\n")}

### Task:
1. **Initial Understanding:**
   - Understand the GitHub issue and its requirements.
   - Identify the goal and what needs to be achieved.

2. **Assess Available Information:**
   - Review the provided codebase information, external information, and previous clarifications.
   - Determine what information is already available.

3. **Identify Missing Information:**
   - Reflect on the provided details and identify all missing pieces of information needed to fully address the issue.
   - Specify clearly what information is missing and why it is needed.

4. **Plan Information Gathering:**
   - Decide on the best action to obtain each missing piece of information (Research Codebase, Research Internet).
   - Formulate the specific questions or queries for each action.

### Important:
If you have all the necessary information to proceed with the task, indicate that no further questions are needed.
`;

  context.push({ role: "user", content: initialPrompt });

  let allInfoGathered = false;
  const gatheredInformation: string[] = [];
  let loops = 0;

  while (!allInfoGathered && loops < maxLoops) {
    loops++;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: context,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: true,
    });

    const toolCalls = response.choices[0]?.message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      allInfoGathered = true;

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments) as {
          query: string;
        };
        // Call the appropriate function based on the function name and arguments.
        // Placeholder for actual function call logic.
        console.log(`Calling function: ${functionName} with arguments:`, args);
        // Simulate function response and update context
        const functionResponse = await simulateFunctionResponse(
          functionName,
          args,
        );
        context.push({
          role: "function",
          name: functionName,
          content: functionResponse,
        });
        gatheredInformation.push(
          `Response from ${functionName}: ${functionResponse}`,
        );
        allInfoGathered = false;
      }

      if (!allInfoGathered) {
        const updatedPrompt = `
### Gathered Information:
${gatheredInformation.join("\n")}
### Missing Information:
Reflect on the gathered information and specify what is still needed to fully address the issue and why it is needed.
### Plan Information Gathering:
Decide on the best action to obtain each missing piece of information (Research Codebase, Research Internet).
Formulate the specific questions or queries for each action.
`;

        context.push({ role: "user", content: updatedPrompt });
      }
    } else {
      allInfoGathered = true;
    }
  }

  if (loops >= maxLoops) {
    console.log("Max loops reached, exiting loop.");
  }
};

async function simulateFunctionResponse(
  functionName: string,
  args: { query: string },
): Promise<string> {
  // Simulate the actual function response based on the function name and arguments.
  // This is just a placeholder and should be replaced with actual logic.
  return JSON.stringify({
    result: `Response from ${functionName} with args: ${JSON.stringify(args)}`,
  });
}

/*
Notes:
- Use a diff format to generate faster/cheaper responses, then do a separate call with the diff + original code to get the new code.

### LLM Diff Format Rules

The LLM Diff Format is designed to be simple, concise, and easy for an LLM to interpret and apply changes to a code file. It builds on traditional diff formats but includes specific line numbers for context to ensure clarity without requiring the LLM to count lines.

### Format Rules

1. **File Header**:
   - Indicate the file being modified.
   - Prefixed with `---` for the original file path and `+++` for the new file path.
   - Format: `--- <original file path>` and `+++ <new file path>`

2. **Chunk Header**:
   - Each chunk of changes should begin with a line starting with "@@".
   - Followed by `-<original start line>` and `+<new start line>`, separated by a space.
   - Format: `@@ -<line number> +<line number> @@`

3. **Line Changes**:
   - Lines removed from the original file should start with a "-" character.
   - Lines added to the new file should start with a "+" character.
   - Unchanged lines should start with a space character and provide context.

4. **Context Lines**:
   - Include at least 5 lines of context before and after the changes to help locate the modifications in the file.
   - If fewer than 5 lines are available before or after the change, include all available lines.

### Example Outline

```plaintext
--- <original file path>
+++ <new file path>
@@ -<line number> +<line number> @@
 context line 1
 context line 2
 context line 3
 context line 4
 context line 5
- removed line
+ added line
 context line 6
 context line 7
 context line 8
 context line 9
 context line 10
```

### Reasoning

1. **Simplicity**:
   - The format is straightforward, using familiar diff conventions while including explicit line numbers to ensure clarity.

2. **Context**:
   - Providing sufficient context lines helps the LLM locate the modifications within the file easily.

3. **Clarity**:
   - Explicit line numbers and a clear distinction between added and removed lines reduce the chance of errors during interpretation.

### Example for `Chat.tsx`

#### Original Code (with Line Numbers)

```plaintext
1| import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
2| import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
3| import { type FC } from "react";
4| import { type Message } from "~/types";
5| import { ChatInput } from "./ChatInput";
6| import { ChatLoader } from "./ChatLoader";
7| import { ChatMessage } from "./ChatMessage";
8| 
9| interface Props {
10|  messages: Message[];
11|  loading: boolean;
12|  onSend: (message: Message) => void;
13|  onReset: () => void;
14|  onCreateNewTask: (messages: Message[]) => void;
15|  onUpdateIssue: (messages: Message[]) => void;
16|  isResponding?: boolean;
17|  shouldHideLogo?: boolean;
18|  messagesEndRef: React.RefObject<HTMLDivElement>;
19|  sidebarRef: React.RefObject<HTMLDivElement>;
20|  checkIfAtBottom: () => void;
21|  scrollToBottom: () => void;
22|  isAtBottom: boolean;
23| }
24| 
25| export const Chat: FC<Props> = ({
26|  messages,
27|  loading,
28|  onSend,
29|  onCreateNewTask,
30|  onUpdateIssue,
31|  isResponding = false,
32|  messagesEndRef,
33|  sidebarRef,
34|  checkIfAtBottom,
35|  scrollToBottom,
36|  isAtBottom,
37| }) => (
38|  <div
39|    className="space-between flex flex-col rounded-lg px-2 pb-8 sm:p-4"
40|    style={{ height: "calc(100vh - 6rem)" }}
41|  >
42|    <div
43|      className="hide-scrollbar flex flex-1 flex-col overflow-y-auto"
44|      ref={sidebarRef}
45|      onScroll={checkIfAtBottom}
46|    >
47|      {messages.map((message, index) => (
48|        <div key={index} className="my-1 sm:my-2">
49|          <ChatMessage
50|            messageHistory={messages}
51|            message={message}
52|            onCreateNewTask={onCreateNewTask}
53|            onUpdateIssue={onUpdateIssue}
54|            loading={loading}
55|          />
56|        </div>
57|      ))}
58| 
59|      {loading && (
60|        <div className="my-1 sm:my-1.5">
61|          <ChatLoader />
62|        </div>
63|      )}
64|      <div ref={messagesEndRef} />
65|    </div>
66| 
67|    <div className="relative left-0 mt-3 w-full sm:mt-6">
68|      <ChatInput
69|        onSend={onSend}
70|        isResponding={isResponding}
71|        loading={loading}
72|      />
73|      {!isAtBottom && (
74|        <div
75|          className="absolute left-1/2 top-0 -my-14 flex h-10 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white bg-opacity-80  transition duration-300 ease-in-out hover:bg-opacity-100"
76|          onClick={scrollToBottom}
77|        >
78|          <FontAwesomeIcon icon={faArrowDown} size="2x" />
79|        </div>
80|      )}
81|    </div>
82|  </div>
83| );
```

### LLM Diff for Adding Upload Button to `Chat.tsx`

```plaintext
--- src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx
+++ src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx
@@ -1 +1 @@
 import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
 import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
 import { type FC } from "react";
 import { type Message } from "~/types";
 import { ChatInput } from "./ChatInput";
+import { faUpload } from "@fortawesome/free-solid-svg-icons"; // Import the upload icon
 import { ChatLoader } from "./ChatLoader";
 import { ChatMessage } from "./ChatMessage";

@@ -21 +26 @@
  scrollToBottom: () => void;
  isAtBottom: boolean;
 }
 
+const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
+  const files = event.target.files;
+  if (!files) return;
+  // Validate and process the selected files here...
+};

 export const Chat: FC<Props> = ({
  messages,
  loading,
  onSend,

@@ -63 +74 @@
  </div>
 
 <div className="relative left-0 mt-3 w-full sm:mt-6 flex items-center">
+  <div className="mr-2">
+    <input
+      type="file"
+      accept="image/png, image/jpeg"
+      multiple
+      onChange={handleFileSelect}
+      className="hidden"
+      id="file-upload"
+    />
+    <label htmlFor="file-upload" className="cursor-pointer">
+      <FontAwesomeIcon icon={faUpload} size="2x" />
+    </label>
+  </div>
   <ChatInput
     onSend={onSend}
     isResponding={isResponding}
     loading={loading}
```
*/

/*
Notes:
Here is an example of the core planning algorithm prompt

You are an AI coding assistant tasked with addressing a specific GitHub issue for a codebase. Here are the details you need to consider:

1. **Instructions**: {instructions}
2. **Exit Criteria**: {exitCriteria}
3. **Codebase Information**: {codebaseInfo}
4. **External Information**: {externalInfo}
5. **Clarifications from the Project Owner**: {clarifications}

### Task:
Generate a detailed, step-by-step plan to address the GitHub issue. Each step should include:
- The specific action to be taken (e.g., create new code, edit existing code, find and replace).
- The reason for the action.
- Dependencies on other steps.
- Expected outcomes.

### Constraints:
- Ensure the plan satisfies all exit criteria.
- Minimize changes to existing code unless necessary.
- Maintain code quality and follow best practices.
- Document any assumptions or additional information needed.

### Format:
Return the plan as a JSON array of objects. Each object should have the following structure:
- "step": [A brief description of the step]
- "action": [The action to be taken]
- "reason": [Why this action is necessary]
- "dependencies": [Any dependencies on other steps]
- "expected_outcome": [The expected result of this step]

### Example:
[
    {
        "step": "Initialize new feature branch",
        "action": "Create a new branch from the main branch",
        "reason": "To isolate changes from the main codebase",
        "dependencies": [],
        "expected_outcome": "A new feature branch is created"
    },
    {
        "step": "Implement function to handle user input",
        "action": "CreateNewCode",
        "reason": "Add functionality to process user input as per the new feature",
        "dependencies": ["Initialize new feature branch"],
        "expected_outcome": "A new function is added to handle user input"
    }
]


*/

/*
Code to add/remove line numbers (update this to remove side effects of reading/writing files):

```typescript
import * as fs from 'fs';
import * as path from 'path';

type Callback = (error: NodeJS.ErrnoException | null) => void;


export const addLineNumbers = async (filePath: string): Promise<string> => {
    const fileContents = await fs.promises.readFile(filePath, 'utf-8');
    const lines = fileContents.split('\n');
    const numberedLines = lines.map((line, index) => `${index + 1}| ${line}`);
    return numberedLines.join('\n');
  };
  

  export const removeLineNumbers = async (
    numberedContent: string,
    outputPath: string
  ): Promise<void> => {
    const lines = numberedContent.split('\n');
    const originalLines = lines.map(line => line.replace(/^\d+\|\s/, ''));
    const originalContent = originalLines.join('\n');
    await fs.promises.writeFile(outputPath, originalContent, 'utf-8');
  };
*/

/*
sample code for core engine loop:
import { CreateNewCode, EditExistingCode, FindAndReplace, ResearchCodebase, ResearchInternet, AskProjectOwner, BuildCodebase, TestCodebase, Commit, CreatePR } from './tools';

class AICodingAgent {
    private sourceMap: any;
    private pastActions: any[];

    constructor() {
        this.sourceMap = null;
        this.pastActions = [];
    }

    async handleGitHubIssue(issue: any) {
        const { instructions, exitCriteria } = this.parseIssue(issue);

        // Research and gather information
        const codebaseInfo = await this.researchCodebase('repo-name');
        const externalInfo = await this.researchInternet(instructions);
        const clarifications = await this.askProjectOwner('Any clarifications needed');

        // Plan and execute loop
        let plan = await this.planActions(instructions, codebaseInfo, externalInfo, clarifications);
        while (!this.checkExitCriteria(exitCriteria)) {
            for (let action of plan) {
                await this.executeAction(action);
            }

            // Re-evaluate and re-plan if necessary
            const evaluation = await this.evaluateActions();
            if (!this.checkExitCriteria(exitCriteria)) {
                plan = await this.adjustPlan(plan, evaluation);
            }
        }

        // Finalize the process
        await this.finalizeChanges();
    }

    parseIssue(issue: any): { instructions: string, exitCriteria: string[] } {
        // Extract instructions and exit criteria from the issue
        return {
            instructions: issue.instructions,
            exitCriteria: issue.exitCriteria
        };
    }

    async researchCodebase(repoName: string) {
        // Use Research Codebase tool
        return await ResearchCodebase(repoName);
    }

    async researchInternet(instructions: string) {
        // Use Research Internet tool
        return await ResearchInternet(instructions);
    }

    async askProjectOwner(question: string) {
        // Use Ask Project Owner tool
        return await AskProjectOwner(question);
    }

    async planActions(instructions: string, codebaseInfo: any, externalInfo: any, clarifications: any) {
        // Generate a plan of actions based on gathered information
        const prompt = `
        Instructions: ${instructions}
        Codebase Information: ${JSON.stringify(codebaseInfo)}
        External Information: ${JSON.stringify(externalInfo)}
        Clarifications: ${clarifications}
        
        Based on the above information, generate a detailed step-by-step plan to address the issue, including creating new files, editing existing files, and making necessary code changes.
        `;

        const plan = await LLM.generate(prompt);
        return JSON.parse(plan);
    }

    async executeAction(action: any) {
        switch (action.type) {
            case 'CreateNewCode':
                await CreateNewCode(action.details);
                break;
            case 'EditExistingCode':
                await EditExistingCode(action.filePath, action.details);
                break;
            case 'FindAndReplace':
                await FindAndReplace(action.find, action.replace, action.filePath);
                break;
            // Add more cases for different action types...
        }

        // Log the action for future reference
        this.pastActions.push(action);
    }

    async evaluateActions() {
        // Evaluate the results of the actions
        const buildStatus = await this.buildCodebase();
        const testStatus = await this.testCodebase();
        return { buildStatus, testStatus };
    }

    async adjustPlan(plan: any, evaluation: any) {
        // Adjust the plan based on the evaluation results
        const prompt = `
        Current Plan: ${JSON.stringify(plan)}
        Evaluation: ${JSON.stringify(evaluation)}
        
        Based on the above evaluation, adjust the plan to better meet the exit criteria and ensure successful completion of the task.
        `;
        const adjustedPlan = await LLM.generate(prompt);
        return JSON.parse(adjustedPlan);
    }

    async buildCodebase() {
        return await BuildCodebase();
    }

    async testCodebase() {
        return await TestCodebase();
    }

    checkExitCriteria(exitCriteria: string[]): boolean {
        // Check if all exit criteria are satisfied
        // This function needs to be implemented based on your specific criteria
        return true;
    }

    async finalizeChanges() {
        await this.commitChanges();
        await this.createPullRequest();
    }

    async commitChanges() {
        return await Commit();
    }

    async createPullRequest() {
        return await CreatePR();
    }
}
From: https://chatgpt.com/c/bbee7178-4b04-402b-8f74-bd21cfd64a18
*/
