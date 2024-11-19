export const researchQuestions = [
  "How is the front-end component architecture organized? What are the naming conventions and directory structures for components?",
  "What state management patterns are used on the front-end? How is state managed within components and across the application?",
  "How is API communication handled? What HTTP clients or libraries are used for making API calls?",
  "What does the backend framework and architecture look like? How are controllers, services, and models structured?",
  "How is the ORM configured for database interaction? How are model definitions and common database operations handled?",
  "What authentication and authorization mechanisms are implemented? How are login processes, token generation, and session management handled?",
  "What coding standards and linting rules are followed? Are there specific style guides or linting configurations in use?",
  "What are the error handling and logging practices? What libraries are used, and how are logs structured for debugging?",
  "How are build scripts and deployment processes managed? What environment configurations exist for development, staging, and production?",
  "What testing frameworks and practices are used? How are unit, integration, and end-to-end tests organized within the project?",
];

export const detailedResearchQuestions = [
  "For the front-end framework and component architecture, what are the component organization and naming conventions? How are components structured within the project directories? What are the naming conventions for files and components to maintain consistency?",
  "For the front-end framework and component architecture, what state management patterns are used? How is state managed within components and across the application? What are the best practices for data flow and state updates in the codebase?",
  "For the front-end framework and component architecture, what lifecycle methods or hooks are used? How are they employed to manage component behavior during different stages? What guidelines exist for using lifecycle methods or hooks in the codebase?",
  "For styling and CSS conventions, what CSS preprocessors and methodologies are used? Is Sass, Less, or another preprocessor employed? What methodologies like BEM or SMACSS are adopted for structuring CSS?",
  "For styling and CSS conventions, how are themes implemented in the application? How are variables for colors, fonts, and spacing managed? What is the approach to global styles versus component-specific styles?",
  "For styling and CSS conventions, what responsive design techniques are used? How are media queries and responsive units implemented in the codebase?",
  "For iconography and UI libraries, what icon sets are used in the project? Are libraries like FontAwesome or Material Icons employed, or is there a custom icon set?",
  "For iconography and UI libraries, what custom components and UI elements are used? Are there custom-built UI components or wrappers around third-party libraries? What are the usage guidelines for these components?",
  "For API communication and data fetching, what HTTP clients or libraries are used for making API calls? Is Axios, Fetch API, or another tool employed?",
  "For API communication and data fetching, what data fetching patterns are used? How are asynchronous operations handled? Are `async/await`, Promises, or Observables used in the codebase?",
  "For API communication and data fetching, how are errors handled? What strategies are in place for error handling and retries? How are user notifications managed in case of API failures?",
  "For the backend framework and architecture, what is the project structure and how are modules organized? How are controllers, services, and models structured within the backend code?",
  "For the backend framework and architecture, what design patterns are employed? Are patterns like MVC, Repository, or Singleton used, and how are they implemented?",
  "For ORM usage and database interaction, how is the ORM configured and set up? What are the connection settings and how are model definitions handled?",
  "For ORM usage and database interaction, how are common database operations performed using the ORM? Can you provide examples of querying and data manipulation?",
  "For the database schema and table structures, what are the entity relationships between tables? How are one-to-one, one-to-many, and many-to-many relationships implemented?",
  "For the database schema and table structures, how are key constraints and indexing used? What strategies are employed for optimizing database queries?",
  "For API endpoints and routing structure, how are routes defined in the backend? What are the route definitions, including dynamic parameters and query strings?",
  "For API endpoints and routing structure, what middleware and route guards are in place? How do middleware functions intercept requests for tasks like authentication or logging?",
  "For authentication and authorization mechanisms, what is the authentication flow? How are login processes, token generation, and session management implemented?",
  "For authentication and authorization mechanisms, how are authorization checks enforced? What methods are used for role-based permissions or access control lists (ACLs)?",
  "For state management on the front-end, how is global state managed versus local state? What libraries or tools are used for state management, such as Redux or MobX?",
  "For coding standards and linting rules, what coding style guides are followed? Are there specific conventions like the Airbnb or Google JavaScript style guides?",
  "For coding standards and linting rules, what linting tools and configurations are used? How is ESLint or other tools configured to enforce coding standards?",
  "For error handling and logging practices, what logging libraries are used? How are logs categorized and structured for debugging purposes?",
  "For error handling and logging practices, what are the exception handling strategies? How are exceptions caught and handled, including the use of custom error classes or global handlers?",
  "For dependency management and module bundling, what package managers are used? How are dependencies managed using npm, Yarn, or other tools?",
  "For dependency management and module bundling, what bundling tools are used? How are tools like Webpack or Parcel configured for module bundling?",
  "For build scripts and deployment processes, how are different environments handled during builds? What environment configurations exist for development, staging, and production?",
  "For build scripts and deployment processes, what continuous integration and continuous deployment (CI/CD) pipelines are set up? What tools like Jenkins or GitHub Actions are used, and how are they configured?",
  "For testing frameworks and practices, what frameworks are used for unit testing? How are tests organized and structured within the project?",
  "For testing frameworks and practices, what tools are used for integration and end-to-end testing? How are tools like Cypress or Selenium implemented in the testing process?",
  "For middleware and interceptors, how are front-end interceptors used? How do they manage tasks like adding authentication headers to HTTP requests?",
  "For middleware and interceptors, what backend middleware functions are in place? How do they process requests, such as parsing JSON or handling CORS?",
  "For data validation and sanitization, what validation libraries are used? How is input data validated using libraries like Joi or Validator.js?",
  "For data validation and sanitization, how is input data sanitized to prevent security issues like injection attacks or malformed data?",
  "For security practices and measures, how are encryption and hashing implemented? What algorithms are used to secure sensitive data?",
  "For security practices and measures, how are security headers configured? What HTTP security headers like CSP, HSTS, and XSS Protection are employed?",
  "For internationalization and localization, how are language files structured? How are translation files organized and accessed within the code?",
  "For internationalization and localization, how is locale-specific formatting handled? How are dates, numbers, and currencies formatted according to locale?",
  "For caching strategies and performance optimization, how is client-side caching implemented? What methods are used, such as service workers or localStorage?",
  "For caching strategies and performance optimization, how is server-side caching handled? What mechanisms like in-memory caches or CDN usage are in place?",
  "For event handling and real-time communication, how is WebSocket implementation managed? How is real-time communication established using WebSockets or libraries like Socket.IO?",
  "For event handling and real-time communication, how are event emitters and listeners used within the application? What patterns are employed for emitting and listening to events?",
  "For accessibility standards compliance, how are ARIA roles and labels used? How do ARIA attributes enhance accessibility in the application?",
  "For accessibility standards compliance, how is keyboard navigation supported? What measures are in place to ensure the application is navigable via keyboard only?",
  "For configuration management, how are environment variables managed and accessed? What practices are used for handling configuration settings across different environments?",
  "For configuration management, how are configuration files structured? How are configuration files used for different environments and settings?",
  "For repository structure and branching strategy, what Git workflow is used? Is there a specific branching strategy like GitFlow or trunk-based development?",
  "For repository structure and branching strategy, what are the commit message conventions? Are conventions like Conventional Commits followed?",
  "For sample code patterns and reusable components, what utility functions are commonly used? What are their purposes within the codebase?",
  "For sample code patterns and reusable components, what code snippets or templates are available for common tasks? How are these used to ensure consistency?",
  "For logging and monitoring tools, what monitoring services are used? Are tools like New Relic or Datadog employed for application monitoring?",
  "For logging and monitoring tools, how are alerts configured for critical issues? What mechanisms are in place for alerting and notifications?",
  "For data serialization formats, what data formats are used for API communication? Is JSON, XML, or another format utilized?",
  "For data serialization formats, what serialization libraries are used? How is data serialization and deserialization handled in the codebase?",
  "For API documentation, what documentation tools are used? Are tools like Swagger or API Blueprint employed for documenting APIs?",
  "For API documentation, how is versioned documentation maintained? What practices are in place for handling different API versions?",
  "For task scheduling and background jobs, how are job queues managed? What systems like RabbitMQ are used for managing background jobs?",
  "For task scheduling and background jobs, how are scheduled tasks set up? Are cron jobs or scheduling libraries used, and how are they configured?",
  "For static code analysis, what analysis tools are used? Are tools like SonarQube or Code Climate utilized for static code analysis?",
  "For static code analysis, what code metrics are monitored? How are metrics like code complexity or duplication tracked?",
  "For deployment environments, what does the infrastructure overview look like? Is the application hosted on cloud-based services like AWS, Azure, or GCP, or on-premises?",
  "For deployment environments, what deployment scripts are used? How are scripts or tools utilized for deploying the application?",
  "For feature flags and toggle management, how are feature flags implemented in code? How are they used to enable or disable features dynamically?",
  "For feature flags and toggle management, how are feature toggles managed across environments? What tools or practices are in place for managing feature toggles?",
  "For continuous integration and continuous deployment (CI/CD) pipelines, what are the pipeline stages? How are stages like build, test, and deploy configured?",
  "For continuous integration and continuous deployment (CI/CD) pipelines, how are automated tests integrated into the pipeline? What practices ensure tests are run during the CI/CD process?",
  "For data privacy and compliance, how is GDPR compliance achieved? What measures are taken to comply with data protection regulations like GDPR?",
  "For data privacy and compliance, how is data anonymization handled? What processes are in place for anonymizing or pseudonymizing data when necessary?",
  "For session management, how is session storage managed? Are sessions stored in-memory, in a database, or using a session store?",
  "For session management, how is session security ensured? What measures are taken to secure session data, including expiration and invalidation?",
  "For third-party services integration, how are OAuth and social logins integrated? What methods are used for integrating third-party authentication providers?",
  "For third-party services integration, how are payment gateways implemented? How are services like Stripe or PayPal integrated into the application?",
  "For rate limiting and throttling, how are client-side limits enforced? What mechanisms prevent excessive requests from the client side?",
  "For rate limiting and throttling, how is server-side throttling handled? What strategies are used to protect the server from abuse?",
  "For asynchronous programming patterns, how are Promises and async/await used? How is asynchronous code handled within the application?",
  "For asynchronous programming patterns, are Observables or reactive programming libraries like RxJS used? How are they implemented in the codebase?",
  "For error reporting and user feedback, how are user notifications managed? How are error messages and notifications presented to the user?",
  "For error reporting and user feedback, what reporting tools are used? Are tools like Sentry used for error reporting and tracking?",
  "For build optimization, how is minification and uglification handled? What processes reduce bundle sizes in the build?",
  "For build optimization, how is tree shaking implemented? How is unused code eliminated from the final build?",
  "For progressive web app (PWA) features, how are service workers implemented? How do they provide offline support and other PWA features?",
  "For progressive web app (PWA) features, how is the web app manifest configured? What settings are used to enable PWA capabilities?",
  "For content security policy (CSP), how is CSP configured? What policies are in place to enhance security?",
  "For content security policy (CSP), how are CSP violations handled? How are violations monitored and reported?",
  "For cross-origin resource sharing (CORS), how is CORS configured on the server? What settings allow or restrict cross-origin requests?",
  "For cross-origin resource sharing (CORS), how are preflight requests managed? How are OPTIONS requests handled for CORS?",
  "For real-time data synchronization, what data sync mechanisms are used? How is data kept in sync across clients using WebSockets or Server-Sent Events?",
  "For real-time data synchronization, how is conflict resolution handled? What strategies manage data conflicts in real-time applications?",
  "For package version management, how are dependency versions controlled? How are version locks and package updates managed?",
  "For package version management, what is the process for upgrading dependencies? How are breaking changes handled during updates?",
  "For accessibility testing, what automated testing tools are used? Are tools like aXe or Lighthouse utilized for accessibility testing?",
  "For accessibility testing, what manual testing practices are followed? How is compliance with accessibility standards ensured through manual testing?",
  "For localization and time zones, how is time zone handling managed? How are different time zones handled for data storage and display?",
  "For localization and time zones, what localization libraries are used? Are libraries like Moment.js or Intl employed?",
  "For image and asset optimization, how is image compression handled? What techniques are used to optimize images for web use?",
  "For image and asset optimization, what asset loading strategies are employed? How are techniques like lazy loading or preloading implemented?",
  "For licensing and open-source compliance, what software licenses are used for third-party components? How are compliance requirements managed?",
  "For licensing and open-source compliance, how are attribution notices handled? What practices are in place for attributing open-source components?",
  "For development environment setup, what IDE and editor configurations are recommended? What settings, extensions, or plugins are suggested for development?",
  "For development environment setup, what local development scripts are available? How are scripts used for setting up and running the application locally?",
];
