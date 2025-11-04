# Project: Aurora Nova

## Project Overview

Aurora Nova is a web application built with Next.js, TypeScript, and PostgreSQL. It provides a secure and flexible system for managing users, roles, and permissions, using a Role-Based Access Control (RBAC) model. The application uses `next-auth` for authentication, Prisma as the ORM, and `shadcn/ui` for the user interface.

The project is structured as a monorepo with the main application in the `app` directory. The `database` directory contains scripts for database management, and the `docs` directory contains project documentation.

## Building and Running

### Prerequisites

*   [Node.js](https://nodejs.org) (v20.x or higher)
*   [npm](https://www.npmjs.com) (v9.x or higher)
*   [Docker](https://www.docker.com) and [Docker Compose](https://docs.docker.com/compose/)

### Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the database:**
    ```bash
    docker-compose up -d
    ```

3.  **Run database migrations and seed the database:**
    ```bash
    npm run db:deploy
    npm run db:seed
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Testing

The project uses `vitest` for testing. The following scripts are available:

*   `npm test`: Run all tests.
*   `npm run test:ui`: Run tests with the UI.
*   `npm run test:run`: Run all tests once.
*   `npm run test:coverage`: Run tests and generate a coverage report.
*   `npm run test:watch`: Run tests in watch mode.

## Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style. Run `npm run lint` to check for linting errors.
*   **Testing:** The project uses `vitest` for unit and integration testing. Tests are located in the `src/__tests__` directory.
*   **Commits:** (No information on commit conventions was found in the analyzed files.)
*   **Database:** The project uses Prisma for database migrations and as an ORM. The database schema is defined in `prisma/schema.prisma`.
