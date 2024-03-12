# JACoB README

## Overview

JACoB (Just Another Coding Bot) leverages Large Language Models (LLMs) to enhance software development workflows, using an event-driven framework for seamless integration with development tools. Designed to improve team collaboration and coding efficiency, JACoB excels in environments utilizing TypeScript and Next.js applications with Tailwind CSS, with plans to support additional languages and frameworks.

## Quick Start

To try out the hosted version of JACoB, visit the [JACoB Main Website](https://www.jacb.ai). For a self-hosted version, follow the steps below to set up JACoB locally.

### Prerequisites

- GitHub and Figma accounts
- Node.js installed locally

### Installation Steps for Self-Hosted Version

1. **GitHub App Creation**

   - Visit [GitHub's New App page](https://github.com/settings/apps/new) to create a new GitHub app. Fill in the basic details, including the app name and description.
   - Set the Webhook URL to your smee.io channel URL. Create a smee channel at [smee.io](https://smee.io) if you haven't already. This will proxy GitHub webhooks to your local development environment.
   - Subscribe to webhook events such as `Issue comments`, `Issues`, `Pull request review comments`, and `Pull requests`.
   - Note down the `App ID`, `Client ID`, `Client Secret`, and generate a `Private Key`. These will be used in your `.env` configuration.

2. **Running Smee**

   - Start your smee client with the command `smee -u [Your smee.io URL]`, ensuring it's forwarding to your local server's port (e.g., `http://localhost:3000/`).

3. **JACoB Configuration**

   - In your project's root, run `npx jacob-setup create` to generate a `jacob.config` file. This file configures JACoB for your specific project environment and needs.
   - Edit `jacob.config` to specify your project’s details, including any necessary environment variables for building your application.

4. **Figma Plugin Installation**
   - Clone and build the JACoB Figma plugin repository. Instructions for building are typically found in the repository's README.
   - Once built, open Figma and navigate to `Plugins > Development > Import plugin from manifest...`, selecting the `manifest.json` file from your local Figma plugin build.
   - Ensure the plugin is configured to interact with your local JACoB instance by setting the appropriate URLs in its configuration.

## Local Development Setup

1. **Environment Setup**

   - Create a `.env` file based on `.env.example`, configuring values for `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, and your `OPENAI_API_KEY` among others.

2. **Infrastructure with Docker**

   - Use `docker compose up -d` to start essential services like RabbitMQ and Postgres.

3. **Dependency Management**

   - Install project dependencies with `npm install`.

4. **Database Setup**

   - Execute `npm run db create` and `npm run db migrate` to prepare your local databases.

5. **Testing and Running**
   - Verify the setup with `npm test`.
   - Launch the development server using `npm run dev`.

### Final Steps to Ensure Proper Configuration

After setting up your environment and JACoB's core components, perform the following steps to ensure everything is integrated correctly:

1. **Install the Registered GitHub App**

   - Navigate to the settings page of your newly created GitHub app and install it on a repository you wish to use with JACoB. This step is crucial for enabling JACoB to interact with your repository.

2. **Authenticate with JACoB**

   - Ensure you can navigate to the `/auth/github` route in your local JACoB instance and successfully sign in using GitHub. This step verifies the OAuth flow is correctly set up between your GitHub app and JACoB.

3. **Verify Webhook Functionality**
   - Create or comment on an issue in the repository where JACoB is installed. Check your local server logs to confirm that these events trigger the expected activities in JACoB. This step is essential to confirm that webhooks are properly set up and that JACoB is responding to GitHub events as expected.

### Using GitHub's Webhook Replay Feature for Testing

After you've set up your local JACoB environment and configured the GitHub app, you'll likely want to test how JACoB handles specific GitHub webhook events (e.g., issue creation, pull request updates). Instead of repeatedly performing actions on GitHub to trigger these events, you can use GitHub's webhook replay feature to simulate them. Here’s how:

1. **Access the Webhook Settings**: Go to your GitHub app's settings page and navigate to the "Advanced" section, where you'll find a list of delivered webhooks.

2. **Identify the Event to Replay**: Look through the list of delivered webhooks to find the event you want to test with JACoB. This list provides details about each event, including its type, delivery status, and payload.

3. **Replay the Webhook**: Next to the event you want to replay, you'll see a "Redeliver" button. Clicking this button will resend the webhook's payload to your specified endpoint (in this case, your local JACoB instance via the smee.io URL or directly if you're testing in a production-like environment).

4. **Monitor the Response**: After replaying the webhook, monitor your JACoB logs or the development server output to see how it processes the event. This immediate feedback is invaluable for debugging and ensures that JACoB reacts as expected to the simulated events.

5. **Iterate as Needed**: If the behavior isn’t what you anticipated, make the necessary adjustments to your JACoB configuration or code, and use the replay feature again to test the changes. This cycle can be repeated as many times as needed to achieve the desired outcome.

## Running Local Models with Ollama

JACoB supports using Ollama for local LLM integration, providing a drop-in alternative for using open-source language models directly within your development environment. Please note that JACoB's architecture is optimized to work with GPT-4 and may not perform well with smaller models.

Follow these steps to set up and run Ollama with JACoB:

### Installation

- **macOS and Windows (Preview)**: Download the installer from the official [Ollama website](https://ollama.com).
- **Linux**:

  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

- **Docker**:
  Use the official Ollama Docker image:

  ```bash
  docker pull ollama/ollama
  ```

### Libraries

Install the Ollama library for your programming language:

- Python: `ollama-python`
- JavaScript: `ollama-js`

### Quickstart

To start using Ollama with Llama 2, execute:

```bash
ollama run llama2
```

### Model Library

Explore various models supported by Ollama at [ollama.com/library](https://ollama.com/library). Download and run models as needed, e.g.:

- For Llama 2 (7B parameters, 3.8GB): `ollama run llama2`
- For Code Llama (specialized for coding tasks): `ollama run codellama`

### JACoB Integration

After setting up Ollama:

1. Update your `.env` configuration in the JACoB setup by changing the `LLM_PROVIDER` variable to `"ollama"`.
2. Restart JACoB to apply the changes.

### System Requirements

Ensure your system meets the RAM requirements for the chosen models:

- At least 8 GB for 7B models.
- 16 GB for 13B models.
- 32 GB or more for models above 33B.

By integrating Ollama, you leverage local processing of language models, enhancing privacy and reducing latency in your development workflow with JACoB.

## Contributing

Contributions are welcome! Check our [contribution guidelines](https://docs.jacb.ai/contributing) for how to proceed. Open issues for any bugs or feature discussions before submitting pull requests and ensure adherence to project coding standards.

## Additional Resources

- [JACoB Main Website](https://www.jacb.ai)
- [Detailed Documentation](https://docs.jacb.ai)

## License

Licensed under the Apache License 2.0. See the [LICENSE](https://www.apache.org/licenses/LICENSE-2.0) file for more details.

## Acknowledgements

A heartfelt thank you to the developer community for contributions and support. JACoB is a community-driven project, and its success is thanks to the collaborative effort of developers worldwide.
