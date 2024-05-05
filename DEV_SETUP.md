# Development Setup

To contribute to this project, you'll need to set up your development environment. Please follow the instructions below to ensure you have the necessary tools and dependencies installed.

## Prerequisites

Before you begin, make sure you have the following prerequisites installed on your system:

1. **Node.js**: This project requires Node.js, a JavaScript runtime, to build and run. You can download and install Node.js from the official website: [Node.js Download](https://nodejs.org/).

   To check if Node.js is installed, open your terminal and run:

   ```bash
   node -v
   ```

   You should see the installed Node.js version.

2. **pnpm**: Although `npm` is included with Node.js and is used to manage project dependencies. In this project, we are using `pnpm` as a package manager. See [pnpm Installation](https://pnpm.io/installation) for more information on installing `pnpm`.
    To check if `pnpm` is installed, open your terminal and run:

   ```bash
   bun -v
   ```

   Make sure `pnpm` is up to date.

## Installation

After ensuring you have Node.js and `pnpm` installed, follow these steps to set up your development environment:

1. **Clone the Repository**: Fork and clone this repository to your local machine:

   ```bash
   git clone git@github.com:UmbrellaDocs/linkspector.git
   ```

2. **Change Directory**: Navigate to the project directory:

   ```bash
   cd linkspector
   ```

3. **Install Dependencies**: Use `pnpm` to install project dependencies:

   ```bash
   pnpm install
   ```

   This command will download and install all the required packages specified in the `package.json` file.

## Contributing

You are now set up to contribute to the project! Follow the [Contributing Guidelines](CONTRIBUTING.md) for information on reporting issues, submitting pull requests, and more.
