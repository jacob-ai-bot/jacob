# otto-mvp

MVP version of the Otto codebase

# Architectural Plan

This project leverages the power of AI to automate various roles in the software development lifecycle. It uses a centralized Event Hub for communication between different AI agents, ensuring a decoupled and scalable system.

## Components

- **Event Hub (Message Bus)**: A centralized communication system that facilitates the exchange of messages between different AI agents.

- **Software Project Manager Agent**: Responsible for planning and coordinating tasks. Creates and updates plans based on input from other agents and users.

- **Reviewer Agent**: Conducts code reviews and provides feedback. Interacts with the Software Engineer Agent for any required changes.

- **Client Account Manager Agent**: Manages user interaction via Slack. Receives user feedback and communicates it to the relevant agents.

- **Software Engineer Agent**: Writes, tests, and builds code based on the plan provided by the Project Manager Agent.

- **Task Queue**: A queue for handling incoming tasks, maintaining the order of execution.

- **Database/State Management**: Keeps track of the state and details of each task, including plans, code, reviews, and user feedback.

## Workflow

1. **Task Initialization**: A new task is enqueued in the Task Queue. The Software Project Manager Agent dequeues the task and creates a plan. The plan is published to the Event Hub.

2. **Client Interaction**: The Client Account Manager Agent picks up the plan from the Event Hub. Sends the plan to the user via Slack and waits for feedback. Publishes user feedback to the Event Hub.

3. **Plan Update and Code Generation**: The Software Project Manager Agent receives user feedback and updates the plan. The updated plan is sent to the Software Engineer Agent via the Event Hub. The Software Engineer Agent writes the code and sends it for review through the Event Hub.

4. **Code Review**: The Reviewer Agent picks up the code from the Event Hub and reviews it. Feedback from the review is sent back to the Software Engineer Agent via the Event Hub. Necessary changes are made, and the code is finalized.

5. **Completion and Notification**: The final code and results are communicated to the Client Account Manager Agent via the Event Hub. The user is notified via Slack, and the task is marked as complete.

## Diagram

This diagram represents the flow of tasks and information between different components of the system. The arrows indicate the direction of communication or task flow.

```
Task Queue → Software Project Manager Agent → Event Hub
                 ↓
Client Account Manager Agent ← Event Hub
                 ↓
Software Engineer Agent → Reviewer Agent → Event Hub
                 ↓
Database/State Management
```

## Local dev setup

* Create the `.env` file based on `.env.example`
  * Configure a smee.io URL
  * Generate a `GITHUB_WEBHOOK_SECRET`
  * Generate a `GITHUB_PRIVATE_KEY`
  * Set the proper `OPENAI_API_KEY`
  * Register a GitHub app (use the fields above) and take note of the `GITHUB_APP_ID`, the `GITHUB_CLIENT_ID`, and the `GITHUB_CLIENT_SECRET` (note that this needs to be populated as both `GITHUB_CLIENT_SECRET` and `VITE_GITHUB_CLIENT_SECRET` in the `.env` file)
    * Ensure the app is listening for the following webhook events: `Issue comments`, `Issues`, `Pull request review comments`, and `Pull request reviews`
* Assuming `docker` is installed locally, run this to start RabbitMQ and Postgres:
```console
docker compose up -d
```
* Ensure you are using the version of `node` referenced in `.tool-versions` (handled automatically if you are using `asdf`)
* Install dependencies:
```console
npm install
```
* Create local dev and test databases:
```console
npm run db create
```
* Migrate local dev database:
```console
npm run db migrate
```
* Verify tests pass:
```console
npm test
```
* Start dev server:
```console
npm run dev
```
* Install the registered GitHub app on a repo on github.com
* Verify that you can visit the `/auth/github` page and sign in to github
* Verify local server log activity when github repo issues are created or commented on.
