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

[![GitHub license](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/jacob-ai-bot/jacob/blob/main/LICENSE)
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label&color=blue)](https://discord.gg/sSDbPR4BUH)

## Table of Contents

- [Overview](#overview)
- [Videos](#videos)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps-for-self-hosted-version)

## Overview

JACoB, Just Another Coding Bot, is an open-source tool designed to streamline your development process by automating coding tasks, transforming Figma designs into deployable code, and integrating seamlessly into your existing workflow. As an AI-powered team member, JACoB works alongside you, learning your coding style and preferences to generate consistent, high-quality code output that fits right into your project’s architecture.

JACoB is designed to be flexible and extensible, allowing you to customize its behavior to fit your specific needs. It integrates with GitHub and Figma, ensuring a smooth transition from design to deployable code, tailored to your project's standards. JACoB is built for privacy and security, ensuring that your code and data remain secure and private.

## Why We Built JACoB

AI is already changing the way software is written and these changes are only going to accelerate over time. We believe that developers, not large corporations, should be at the forefront of this change. JACoB is designed to help developers leverage AI to make their lives easier, to be more productive and to build better software. Our team is committed to building a tool that is open, transparent and respectful of the privacy and security of developers and their code. Every developer in the world should have a say in how AI is used in software development, and JACoB is our contribution to that conversation. We hope you'll join us in building the future of AI in software development, together.

## Videos

### One Minute

Here's a high-level overview to see how JACoB works. This video shows the Figma and GitHub integration, along with a preview of the real-time web portal. [Watch on YouTube](https://www.youtube.com/watch?v=9Hdk2o27NaY)

[![Overview](http://img.youtube.com/vi/9Hdk2o27NaY/0.jpg)](https://www.youtube.com/watch?v=9Hdk2o27NaY "JACoB Overview")

We also put together a fun little JACoB "trailer" video for the socials. [Watch on YouTube](https://www.youtube.com/watch?v=G_yS5Y0o80Q)

[![Trailer](http://img.youtube.com/vi/G_yS5Y0o80Q/0.jpg)](https://www.youtube.com/watch?v=G_yS5Y0o80Q "JACoB Trailer")

### Three Minute

This walkthrough video shows an example of the JACoB web portal reviewing an existing GitHub issue that contains a Figma design. JACoB detects the link, opens the design in Figma, and uses the JACoB Figma plugin to convert the design to code. [Watch on YouTube](https://www.youtube.com/watch?v=xnlsO2h-3EE)

[![Design To Code](http://img.youtube.com/vi/xnlsO2h-3EE/0.jpg)](https://www.youtube.com/watch?v=xnlsO2h-3EE "Design to Code")

The JACoB web portal has a feature where users can view tasks assigned to them in GitHub and then work with the AI to add more details and context. Once the issue has been approved, the user can update the issue directly on GitHub and the JACoB coding engine will start working on the task, ultimately creating a PR. [Watch on YouTube](https://www.youtube.com/watch?v=AcQsKkz8jdc)

[![Existing Task](http://img.youtube.com/vi/AcQsKkz8jdc/0.jpg)](https://www.youtube.com/watch?v=AcQsKkz8jdc "JACoB Existing Task")

### Half Hour

Here's a working session where I recorded myself using JACoB for a real-world task. For this scenario, I had several pages of onboarding screens that I needed to create for the JACoB setup process (starting at https://jacb.ai/signup). This video shows the process I used to convert these designs into code, including time that I spent correcting a few minor errors and ultimately creating the pages that are live on the site today. [Watch on YouTube](https://www.youtube.com/watch?v=5QWvnUQ3mXk)

[![JACoB Setup](http://img.youtube.com/vi/5QWvnUQ3mXk/0.jpg)](https://www.youtube.com/watch?v=5QWvnUQ3mXk "JACoB Setup")

### One Hour

I've personally used JACoB to save myself a ton of time over the past year. Chris and I weren't just trying to beat benchmarks, we built JACoB to make our real-life production-level tasks faster, easier, and way more fun. To see JACoB being used to build the jacb.ai site in about an hour, watch our [demo video](https://www.youtube.com/watch?v=OfRUaehTcEM)

[![JACoB Website](http://img.youtube.com/vi/OfRUaehTcEM/0.jpg)](http://www.youtube.com/watch?v=OfRUaehTcEM "JACoB Website")

## Not Just Another Cool Demo

JACoB is a product of a full year of research and development around using AI for real-world production scenarios, and we've published a technical white paper to provide a deep dive into JACoB's methodology and architecture. The paper covers the architecture of JACoB, an evaluation of JACoB with other tools and a roadmap for future development.

**[Read the Technical White Paper](https://jacb.ai/paper)**

To evaluate JACoB, we recruited a wide variety of developers to visit the [JACoB Arena](https://jacb.ai/arena) to compare JACoB's capabilities against the top design-to-code tools and human benchmarks. The [results](https://www.jacb.ai/results?all=1) were impressive, with JACoB outperforming seven top design-to-code tools. The JACoB Arena is a great place to see the quality of JACoB's output for yourself.

## Limitations

Our approach for building JACoB was to start with a set of narrowly-defined tasks that the current generation of AI models are capable of today, with the hope of inspiring the JACoB community to contribute to additional languages and frameworks over time. We also acknowledge that limitations in context window sizes and overall model intelligence means that JACoB is focused on smaller, more descrete tasks. While JACoB has the potential to work across any codebase, we've focused initially on a limited number of languages and frameworks. Specficially, JACoB currently works best with:

- TypeScript or JavaScript
- NextJS applications
- Tailwind
- Figma for designs

We're focused on results over hype, and we're looking forward to building out the capabilities of JACoB with other like-minded developers.

## Quick Start

JACoB integrates directly into your GitHub workflow, transforming Figma designs into deployable code and understanding your entire codebase. Begin by [signing up](https://jacb.ai/signup) to explore JACoB's capabilities or follow our [quick start guide](https://docs.jacb.ai/overview/quickstart) for immediate onboarding.

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

We rely on commercial or open-source LLMs and do not train on any data. The hosted version contains logs that will have code snippets. Our GitHub app tokens have an 8-hour expiration. The hosted version uses the OpenAI API, you can read their [API data privacy policy here](https://openai.com/enterprise-privacy). The self-hosted version can be run on your own infrastructure and using your own OpenAI API key or local language models via Ollama.

## Getting Started

JACoB works via a custom GitHub app and a Figma Plugin, along with a command-line tool to set up the configuation options. To try out the hosted version of JACoB, visit the [JACoB Website](https://www.jacb.ai). For a self-hosted version, follow the steps below to set up JACoB locally.

## Technologies Used

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)
- [Orchid ORM](https://orchid-orm.netlify.app)

### Prerequisites

- GitHub and Figma accounts
- Node.js installed locally
- Docker and Docker Compose installed locally
- An OpenAI account
- A [PortKey](https://app.portkey.ai/) account

### Installation Steps for Self-Hosted Version

1. **GitHub App Creation**

   - Visit [GitHub's New App page](https://github.com/settings/apps/new) to create a new GitHub app. Fill in the basic details, including the app name and description.
   - Generate a Webhook Secret (run `openssl rand -base64 32` to generate a secret key)
   - Generate a `GITHUB_PRIVATE_KEY` and save it. This will be used in your `.env` configuration.
   - Set one of the Callback URLs to `http://localhost:3000/api/auth/callback/github` (for Auth.js).
   - Set another of the Callback URLs to `http://localhost:3000/auth/github` (for Figma Auth).
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

   - Start your smee client with the command `smee -u [Your smee.io URL] --target  http://localhost:3000/api/github/webhooks`, ensuring it's forwarding to your local server's port.

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

   - Create the `.env` file based on `.env.example`
     - Configure a smee.io URL
     - Set the proper `OPENAI_API_KEY`
     - Set the proper `PORTKEY_API_KEY` and `PORTKEY_VIRTUAL_KEY_*` keys
       - Note: Depending on the models currently being used, JACoB may require that you have a [virtual key](https://docs.portkey.ai/docs/product/ai-gateway-streamline-llm-integrations/virtual-keys) for each LLM provider
     - Set the `GITHUB_PRIVATE_KEY` generated in the GitHub app setup
     - From the a GitHub app, populate the `GITHUB_APP_ID`, the `GITHUB_APP_NAME`, the `GITHUB_CLIENT_ID`, and the `GITHUB_CLIENT_SECRET` (note that this needs to be populated as both `GITHUB_CLIENT_SECRET` and `VITE_GITHUB_CLIENT_SECRET` in the `.env` file)
     - Determine the `GITHUB_APP_USERNAME` by calling a URL like this https://api.github.com/users/[GITHUB_APP_NAME][bot] and look at the `id` in the response (it will be a number)
     - Later: After logging in to the local website, set the dashboardEnabled value on your row in the users table to TRUE. Set the role on this row to 'admin'.
     - Later: After connecting a repo to the local GitHub app, set the agentEnabled value on the associated row in the projects table to TRUE
   - Ensure the app is listening for the following webhook events: `Issue comments`, `Issues`, `Pull request review comments`, and `Pull request reviews`

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

   - Visit http://localhost:3000 and ensure you can successfully sign in using GitHub. This step verifies the OAuth flow is correctly set up between your GitHub app and JACoB.

3. **Verify Webhook Functionality**

   - Create or comment on an issue in the repository where JACoB is installed. Check your local server logs to confirm that these events trigger the expected activities in JACoB. This step is essential to confirm that webhooks are properly set up and that JACoB is responding to GitHub events as expected.

4. **Verify Dashboard Functionality**
   - After logging in, visit http://localhost:3000/dashboard and choose one of the personas to start interacting with JACoB

### Using GitHub's Webhook Replay Feature for Testing

After you've set up your local JACoB environment and configured the GitHub app, you'll likely want to test how JACoB handles specific GitHub webhook events (e.g., issue creation, pull request updates). Instead of repeatedly performing actions on GitHub to trigger these events, you can use GitHub's webhook replay feature to simulate them. Here’s how:

1. **Access the Webhook Settings**: Go to your GitHub app's settings page and navigate to the "Advanced" section, where you'll find a list of delivered webhooks.

2. **Identify the Event to Replay**: Look through the list of delivered webhooks to find the event you want to test with JACoB. This list provides details about each event, including its type, delivery status, and payload.

3. **Replay the Webhook**: Next to the event you want to replay, you'll see a "Redeliver" button. Clicking this button will resend the webhook's payload to your specified endpoint (in this case, your local JACoB instance via the smee.io URL or directly if you're testing in a production-like environment).

4. **Monitor the Response**: After replaying the webhook, monitor your JACoB logs or the development server output to see how it processes the event. This immediate feedback is invaluable for debugging and ensures that JACoB reacts as expected to the simulated events.

5. **Iterate as Needed**: If the behavior isn’t what you anticipated, make the necessary adjustments to your JACoB configuration or code, and use the replay feature again to test the changes. This cycle can be repeated as many times as needed to achieve the desired outcome.

## Contributing

We welcome contributions! From language support to framework integrations, there's always room for new features and improvements. Join our [Discord](https://discord.gg/sSDbPR4BUH) community for discussions and support.

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
