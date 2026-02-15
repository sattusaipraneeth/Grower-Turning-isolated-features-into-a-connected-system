README.md
Diff
Original
Modified
# Grower: Turning Isolated Features into a Connected System

## Table of Contents

- [About](#about)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
  - [Building for Production](#building-for-production)
  - [Deployment](#deployment)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## About

**Grower** is a personal growth and productivity application designed to help users manage habits, tasks, goals, and focus time within a connected system. It aims to transform isolated productivity features into a cohesive experience, enabling users to track their progress, reflect on their week, and maintain focus. The application is built as a modern web application, offering a responsive and intuitive user interface.

## Features

Grower provides a comprehensive suite of tools to support personal development and productivity:

-   **Dashboard**: A central hub providing an overview of daily progress, system health, weekly momentum, tasks completed, focus time, and events. It aggregates data from various modules to give a quick snapshot of the user's productivity and well-being.
-   **Calendar**: A visual interface to manage and schedule events, appointments, and deadlines, helping users keep track of their commitments.
-   **Files**: While the specific storage mechanism is abstracted, this section is intended for managing files associated with tasks, notes, or goals, providing a centralized document management system within the application.
-   **Focus Timer**: Implements the Pomodoro Technique, allowing users to set customizable work and break intervals. It tracks focus sessions, helps manage distractions, and integrates with study goals to provide a structured environment for deep work.
-   **Goals**: Enables users to define, track, and monitor their personal and professional goals, providing a framework for long-term planning and achievement.
-   **Growth**: Offers analytical insights into user progress over time. This includes detailed weekly habit completion rates, monthly trends, and a visual heatmap of activity, allowing users to identify patterns and areas for improvement. It also supports data export for further analysis.
-   **Habits**: A robust system for creating, tracking, and managing daily habits. Users can monitor their streaks, consistency, and overall progress towards building positive routines.
-   **Notes**: A dedicated and flexible space for capturing thoughts, ideas, meeting minutes, or any important information, ensuring that valuable insights are not lost.
-   **Todos**: A task management system that allows users to create, prioritize (high, medium, low), and track their daily tasks, ensuring important actions are completed.
-   **Weekly Review**: A guided process for users to reflect on their past week. It helps in identifying successes (wins), challenges faced, and setting clear intentions (next focus) for the upcoming week, fostering continuous improvement and self-awareness.

## Technology Stack

The project leverages a modern web development stack to deliver a fast, robust, and scalable application:

-   **Frontend**: 
    -   **React**: A declarative, component-based JavaScript library for building dynamic and interactive user interfaces.
    -   **TypeScript**: A superset of JavaScript that adds static types, significantly improving code quality, readability, and maintainability, especially in larger codebases.
    -   **Vite**: A next-generation frontend tooling that offers lightning-fast cold server start, instant hot module replacement (HMR), and optimized build performance.
    -   **Shadcn UI**: A collection of beautifully designed, accessible, and customizable UI components built using Radix UI primitives and styled with Tailwind CSS. It provides a solid foundation for a consistent and modern user experience.
    -   **Tailwind CSS**: A highly customizable, utility-first CSS framework that enables rapid UI development by composing classes directly in markup.
    -   **date-fns**: A modern JavaScript date utility library that provides a comprehensive, yet lightweight, set of functions for manipulating and formatting dates.
    -   **Recharts**: A flexible and composable charting library built on React components, used for rendering various data visualizations within the application, particularly in the Dashboard and Growth sections.
    -   **react-router-dom**: The standard library for declarative routing in React applications, enabling seamless navigation between different views and pages.
-   **Linting**: 
    -   **ESLint**: A pluggable linting utility for JavaScript and JSX, configured with TypeScript support, to enforce coding standards and catch potential errors early in the development cycle.
-   **Testing**: 
    -   **Vitest**: A fast and modern unit-test framework, powered by Vite, offering a familiar API (Jest-compatible) for testing JavaScript/TypeScript code.
    -   **@testing-library/react**: A set of utilities that encourage good testing practices by focusing on testing component behavior from the user's perspective.
-   **State Management / Data Persistence**: 
    -   The application primarily uses `localStorage` for client-side data persistence. This approach allows user data to be stored directly in the browser, providing a fast and offline-first experience, as observed in `src/lib/timeState.ts` and other components.

## Project Structure

The project follows a component-based architecture, typical for React applications. Key directories and files include:

```
/home/ubuntu/project/
├── public/                 # Static assets served directly by the web server
├── src/                    # Main application source code
│   ├── assets/             # Images, icons, and other static media used by components
│   ├── components/         # Reusable React components
│   │   ├── dashboard/      # Components specifically designed for the Dashboard page
│   │   └── ui/             # Shadcn UI components, often customized or extended
│   ├── hooks/              # Custom React hooks for encapsulating reusable logic (e.g., useDensity, useTheme)
│   ├── lib/                # Utility functions, helper modules, and core application logic (e.g., timeState.ts for data management, utils.ts for general utilities)
│   ├── pages/              # Top-level React components representing different application views/pages (e.g., Dashboard.tsx, Focus.tsx, Growth.tsx)
│   ├── test/               # Unit and integration test files for various parts of the application
│   ├── index.css           # Global CSS styles, including Tailwind CSS directives and custom styles
│   └── main.tsx            # The entry point of the React application, responsible for rendering the root component
├── .gitattributes          # Git attributes for path-specific options
├── .gitignore              # Specifies intentionally untracked files to ignore by Git
├── bun.lockb               # Lock file generated by Bun package manager, ensuring consistent dependency versions
├── components.json         # Configuration file for Shadcn UI, defining aliases and styling preferences
├── eslint.config.js        # ESLint configuration file for code linting rules
├── index.html              # The main HTML file that serves as the entry point for the web application
├── LICENSE                 # Project license file (MIT License)
├── netlify.toml            # Configuration file for Netlify deployments, specifying build commands and publish directory
├── package.json            # Project metadata, dependencies, and npm/bun scripts
├── postcss.config.js       # PostCSS configuration, typically used with Tailwind CSS for processing CSS
├── tailwind.config.ts      # Tailwind CSS configuration file for customizing the framework
├── tsconfig.app.json       # TypeScript configuration specific to the application source files
├── tsconfig.json           # Base TypeScript configuration for the entire project
├── tsconfig.node.json      # TypeScript configuration for Node.js specific files (e.g., Vite config)
├── vite.config.ts          # Vite build configuration file, defining plugins, server settings, and aliases
└── vitest.config.ts        # Vitest test runner configuration file
```

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have the following installed on your development machine:

-   **Node.js**: Version 18 or higher is recommended. You can download it from [nodejs.org](https://nodejs.org/).
-   **Bun**: A fast all-in-one JavaScript runtime, bundler, transpiler, and package manager. It is recommended for this project due to the presence of `bun.lockb`. Install it by following instructions on [bun.sh](https://bun.sh/).

### Installation

1.  **Clone the repository (or extract the provided zip file):**

    If using Git:
    ```bash
    git clone <repository-url>
    cd Grower-Turning-isolated-features-into-a-connected-system
    ```

    *If you received a zip file, extract its contents to your desired project directory. Ensure the extracted content is directly in your project root, not nested within an extra folder.* For example, if you extract to `/my-project`, then `package.json` should be at `/my-project/package.json`.

2.  **Install dependencies:**

    Navigate to the project root directory in your terminal and install the required packages using Bun:
    ```bash
    bun install
    ```

    *Alternatively, if you prefer npm or yarn, you can try:*
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Application

To start the development server and view the application in your browser:

```bash
bun run dev
# or
npm run dev
# or
yarn dev
```

The application will typically be available at `http://localhost:8080`. Vite provides hot module replacement, so changes to the source code will automatically reflect in the browser.

### Building for Production

To create an optimized production build of the application:

```bash
bun run build
# or
npm run build
# or
yarn build
```

This command will compile and bundle the application's assets into the `dist` directory, ready for deployment.

### Deployment

This project includes a `netlify.toml` file, indicating it's configured for deployment on Netlify. To deploy:

1.  **Connect your GitHub repository** to Netlify.
2.  Netlify will automatically detect the `netlify.toml` file and configure the build settings.
3.  The `command = "npm run build"` will execute the production build script.
4.  The `publish = "dist"` setting tells Netlify to serve the contents of the `dist` directory.
5.  A redirect rule `from = "/*" to = "/index.html" status = 200` is included to handle client-side routing for single-page applications.

## Scripts

The `package.json` defines several useful scripts for development, building, and testing:

-   `dev`: Starts the development server using Vite, providing a live-reloading environment.
-   `build`: Executes the production build process, optimizing the application for deployment.
-   `build:dev`: Performs a development build, which might be useful for specific debugging scenarios without full production optimizations.
-   `lint`: Runs ESLint across the codebase to identify and fix code style and quality issues.
-   `preview`: Serves the production build locally, allowing you to preview the optimized application before deployment.
-   `test`: Executes unit and integration tests using Vitest.
-   `test:watch`: Runs tests in watch mode, automatically re-running tests when relevant files change.

## Contributing

We welcome contributions to the Grower project! If you'd like to contribute, please follow these steps:

1.  **Fork the repository** on GitHub.
2.  **Clone your forked repository** to your local machine.
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b bugfix/issue-description`.
4.  **Make your changes** and ensure they adhere to the project's coding standards (run `bun run lint`).
5.  **Write and run tests** to cover your changes: `bun run test`.
6.  **Commit your changes** with a clear and descriptive commit message.
7.  **Push your branch** to your forked repository: `git push origin feature/your-feature-name`.
8.  **Open a Pull Request** to the `main` branch of the original repository, describing your changes and their benefits.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
