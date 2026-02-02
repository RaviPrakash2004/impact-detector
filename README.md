# Impacted Test Detector

A CLI tool that determines which tests in a repository are affected by a specific code commit. It uses **Reverse Dependency Analysis** to identify both directly modified tests and tests affected by changes in their dependencies (e.g., helper files).

## Features
- **Direct Impact Detection**: Identifies modified test files.
- **Transitive Dependency Analysis**: Builds a dependency graph to find tests that import modified files (recursively).
- **TypeScript Support**: Uses `ts-morph` for AST-based dependency resolution.

## Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the tool using `npx ts-node` (or compile and run with `node`).

```bash
npx ts-node src/index.ts --commit <COMMIT_SHA> --repo <PATH_TO_TARGET_REPO>
```

### Example
```bash
npx ts-node src/index.ts --commit 67e3c15 --repo ../flash-tests
```

## How It Works

1.  **Git Analysis**: Uses `git diff-tree` to identify changed files in the target commit.
2.  **Dependency Graph**: Parses the codebase using `ts-morph` to build a "Reverse Dependency Graph" (mapping files to their importers).
3.  **Impact Analysis**: Performs a graph traversal (BFS) starting from the changed files. Any reachable file that matches the test pattern (`*.spec.ts`) is flagged as impacted.

## AI Development Process
*Transparency Note:* This tool was built with the assistance of an AI agent.
- **Design**: The agent selected `ts-morph` for robust import analysis over simple regex.
- **Implementation**: The solution is built as a standalone CLI to keep it isolated from the target repository.
- **Verification**: Verified against the `flash-tests` repo, specifically identifying complex dependency chains (e.g., changes in `fixtures.ts` impacting multiple specs).
