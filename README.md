<div align="center">
<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://www.jacb.ai/images/logo.svg" width="300">
  <source media="(prefers-color-scheme: dark)" srcset="https://www.jacb.ai/images/logo-white.svg" width="300">
  <img alt="JACoB logo">
</picture>
<br/>
JACoB: Just Another Coding Bot. Empowering Developers to Automate with AI.
<br/>
</div>

###

[![GitHub license](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/PioneerSquareLabs/otto-mvp/blob/main/LICENSE)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label&color=blue)](https://discord.gg/NWzF9rUe)

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps-for-self-hosted-version)

## Overview

JACoB, Just Another Coding Bot, is an open-source tool designed to streamline your development process by automating coding tasks, transforming Figma designs into deployable code, and integrating seamlessly into your existing workflow. As an AI-powered team member, JACoB works alongside you, learning your coding style and preferences to generate consistent, high-quality code output that fits right into your project’s architecture.

JACoB is designed to be flexible and extensible, allowing you to customize its behavior to fit your specific needs. It integrates with GitHub and Figma, ensuring a smooth transition from design to deployable code, tailored to your project's standards. JACoB is built for privacy and security, ensuring that your code and data remain secure and private.

## Why We Built JACoB

AI is already changing the way software is written and these changes are only going to accelerate over time. We believe that developers, not large corporations, should be at the forefront of this change. JACoB is designed to help developers leverage AI to make their lives easier, to be more productive and to build better software. Our team is committed to building a tool that is open, transparent and respectful of the privacy and security of developers and their code. Every developer in the world should have a say in how AI is used in software development, and JACoB is our contribution to that conversation. We hope you'll join us in building the future of AI in software development, together.

## See How JACoB Works

Our team used JACoB to save hundreds of hours of work over the past year. We weren't just trying to beat outdated benchmarks, we built JACoB to make our real-life production-level tasks faster, easier, and way more fun. To see JACoB being used to build the jacb.ai site in an hour, watch our [demo video](https://www.youtube.com/watch?v=OfRUaehTcEM)

[![JACoB Tutorial](http://img.youtube.com/vi/OfRUaehTcEM/0.jpg)](http://www.youtube.com/watch?v=OfRUaehTcEM "JACoB Tutorial")

## Not Just Another Cool Demo

JACoB is a product of a full year of research and development around using AI for real-world production scenarios, and we've published a technical white paper to provide a deep dive into JACoB's methodology and architecture. The paper covers the architecture of JACoB, an evaluation of JACoB with other tools and a roadmap for future development.

**[Read the Technical White Paper](https://jacb.ai/paper)**

To evaluate JACoB, we recruited a wide variety of developers to visit the [JACoB Arena](https://jacb.ai/arena) to compare JACoB's capabilities against the top design-to-code tools and human benchmarks. The results were impressive, with JACoB vastly outperforming other tools. The JACoB Arena is a great place to see the quality of JACoB's output for yourself.

## Quick Start

JACoB integrates directly into your GitHub workflow, transforming Figma designs into deployable code and understanding your entire codebase. Begin by [signing up](https://jacb.ai/signup) to explore JACoB's capabilities or follow our [quick start guide](https://jacb.ai/quickstart) for immediate onboarding.

## What Makes JACoB Different

JACoB pioneers intelligent automation, handling complete development tasks beyond mere auto-completion. It offers:

- **End-to-End Task Management**: From design conversion to code review.
- **Open Source and Extensible**: Adaptable to your specific needs.
- **Full Codebase View**: Holistic development approach.
- **Customizable Workflow**: Configure via JSON in your codebase.

## Streamlined Workflow

Integrates with GitHub and Figma, eliminating the need for additional tools. This ensures a smooth transition from design to deployable code, tailored to your project's standards.

## Smart Collaboration

JACoB safely reviews and contributes, adhering to your project's code review processes, and supports collaborative coding with AI without disrupting existing workflows.

## Full Codebase Understanding

JACoB learns your coding style and preferences, generating consistent, high-quality code output that fits right into your project’s architecture.

## Built for Privacy and Security

JACoB does not store your code or train on any data. The hosted version contains logs that will have code snippets, which will be retained for 14 days. It uses the OpenAI API, you can read their [API data privacy policy here](https://openai.com/enterprise-privacy). The self-hosted version can be run on your own infrastructure and using your own OpenAI API key or local language models via Ollama.

## Getting Started

JACoB works via a custom GitHub app and a Figma Plugin, along with a command-line tool to set up the configuation options. To try out the hosted version of JACoB, visit the [JACoB Website](https://www.jacb.ai). For a self-hosted version, follow the steps below to set up JACoB locally.

### Prerequisites

- GitHub and Figma accounts
- Node.js installed locally

### Installation Steps for Self-Hosted Version

1. **GitHub App Creation**

   - Visit [GitHub's New App page](https://github.com/settings/apps/new) to create a new GitHub app. Fill in the basic details, including the app name and description.
   - Set the Callback URL to `http://localhost:5173/auth/github`.
   - Set the Webhook URL to your smee.io channel URL. Create a smee channel at [smee.io](https://smee.io) if you haven't already. This will proxy GitHub webhooks to your local development environment.
   - Set the repository permissions to `Read & Write` for the following:
     - `Issues`
     - `Pull requests`
     - `Contents`
     - `Metadata` (can be read-only)
   - Subscribe to webhook events:
     - `Issues`
     - `Issue comments`
     - `Pull requests`
     - `Pull request reviews`
     - `Pull request review comment`
     - `Pull request review threads`
   - Note down the `App ID`, `Client ID`, `Client Secret`, and generate a `Private Key`. These will be used in your `.env` configuration.

2. **Running Smee**

   - Start your smee client with the command `smee -u [Your smee.io URL] --target  http://localhost:5173`, ensuring it's forwarding to your local server's port.

3. **JACoB Configuration**

   - For any project you'd like to use JACoB in, you'll need to setup a config file to ensure JACoB can understand your environment and your personal preferences. Switch to your target project's root, run `npx jacob-setup create` to generate a `jacob.config` file. This file configures JACoB for your specific project environment and needs.
   - Edit `jacob.config` to specify your project’s details, including any necessary environment variables for building your application.
   - Repeat as necessary for any other projects you'd like to use JACoB with.

4. **Figma Plugin Installation**
   - Clone and build the [JACoB Figma plugin repository](https://github.com/PioneerSquareLabs/otto-figma). Instructions for building are typically found in the repository's README.
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

### Ollama Quickstart

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

We welcome contributions! From language support to framework integrations, there's always room for new features and improvements. Check our [Contribution Guidelines](https://docs.jacb.ai/contributing) and join our [Discord](https://discord.gg/NWzF9rUe) community for discussions and support.

## Additional Resources

- **[JACoB Main Website](https://www.jacb.ai)**: Explore JACoB's features and capabilities.
- **[Detailed Documentation](https://docs.jacb.ai)**: Learn how to use JACoB and integrate it into your workflow.
- **[JACoB Arena](https://jacb.ai/arena)**: Compare JACoB's capabilities against other tools.
- **[Technical White Paper](https://jacb.ai/paper)**: Dive deeper into JACoB's methodology and architecture.
- **[YouTube Channel](https://www.youtube.com/channel/UCA_gs2-Nzh8asC5DQFvREPQ)**: Watch tutorials, demos, and discussions on JACoB.

## License

Licensed under the Apache License 2.0. See the [LICENSE](https://www.apache.org/licenses/LICENSE-2.0) file for more details.

## Acknowledgements

A heartfelt thank you to the developer community for contributions and support. JACoB is a community-driven project, and its success is thanks to the collaborative effort of developers worldwide.
