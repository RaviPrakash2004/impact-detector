#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { getChangedFiles } from './git-utils';
import { buildDependencyGraph } from './dependency-graph';
import { findImpactedTests } from './analyzer';

const program = new Command();

program
    .name('impact-detector')
    .description('Detects tests affected by a specific commit')
    .requiredOption('--commit <sha>', 'Commit SHA to analyze')
    .requiredOption('--repo <path>', 'Path to the target repository')
    .action(async (options) => {
        try {
            const repoPath = path.resolve(options.repo);
            const commitSha = options.commit;

            if (!fs.existsSync(repoPath)) {
                console.error(chalk.red(`Repository path does not exist: ${repoPath}`));
                process.exit(1);
            }

            console.log(chalk.blue(`Analyzing commit ${commitSha} in ${repoPath}...`));

            // 1. Get changed files
            console.log(chalk.dim('Fetching changed files...'));
            const changes = await getChangedFiles(repoPath, commitSha);

            if (changes.length === 0) {
                console.log(chalk.yellow('No changed files found for this commit.'));
                return;
            }

            console.log(chalk.dim(`Found ${changes.length} changed files.`));
            changes.forEach(c => console.log(chalk.gray(` - [${c.status}] ${c.file}`)));

            // 2. Build dependency graph
            console.log(chalk.dim('Building dependency graph...'));
            const graph = buildDependencyGraph(repoPath);
            console.log(chalk.dim(`Graph built with ${graph.size} files.`));

            // 3. Analyze impacts
            console.log(chalk.dim('Analyzing impacted tests...'));
            const impacts = findImpactedTests(repoPath, changes, graph);

            // 4. Output results
            if (impacts.length === 0) {
                console.log(chalk.green('No tests impacted.'));
            } else {
                console.log(chalk.bold.white('\nImpacted Tests:'));
                impacts.forEach(t => {
                    const color = t.changeType === 'added' ? chalk.green :
                        t.changeType === 'deleted' ? chalk.red : chalk.yellow;
                    console.log(color(`[${t.changeType.toUpperCase()}] ${t.testName}`));
                });
            }

        } catch (error: any) {
            console.error(chalk.red('Error occurred:'), error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
