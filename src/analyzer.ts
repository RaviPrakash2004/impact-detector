import path from 'path';
import { DependencyGraph } from './dependency-graph';
import { Change } from './git-utils';

export interface ImpactedTest {
    testName: string;
    changeType: 'added' | 'modified' | 'deleted';
    reason?: string; // e.g. "Directly modified" or "Dependency x.ts changed"
}

export function findImpactedTests(
    repoPath: string,
    changes: Change[],
    graph: DependencyGraph
): ImpactedTest[] {
    const impactedFiles = new Map<string, 'added' | 'modified' | 'deleted'>();
    const processingQueue: string[] = [];

    // Normalize paths
    // Changes are relative paths (from git). Graph has absolute paths.
    // Convert changes to absolute paths.

    for (const change of changes) {
        const absPath = path.resolve(repoPath, change.file);
        impactedFiles.set(absPath, change.status);
        if (change.status === 'modified' || change.status === 'added') {
            processingQueue.push(absPath);
        }
    }

    // BFS to find all transitively impacted files
    const alreadyProcessed = new Set<string>(processingQueue);

    while (processingQueue.length > 0) {
        const currentFile = processingQueue.shift()!;

        // Find files that depend on currentFile
        const dependents = graph.get(currentFile);

        if (dependents) {
            for (const dependent of dependents) {
                if (!alreadyProcessed.has(dependent)) {
                    alreadyProcessed.add(dependent);
                    // Mark as modified (indirectly)
                    // We don't overwrite if it was already marked as something else, but here we treat indirect as modified
                    if (!impactedFiles.has(dependent)) {
                        impactedFiles.set(dependent, 'modified');
                    }
                    processingQueue.push(dependent);
                }
            }
        }
    }

    // Filter to find tests
    const impactedTests: ImpactedTest[] = [];
    // Assuming tests match *.spec.ts or *.test.ts. We should make this configurable or robust.
    // Based on flash-tests exploration: tests/*.spec.ts
    const testPattern = /\.spec\.ts$/;

    for (const [file, type] of impactedFiles.entries()) {
        if (testPattern.test(file)) {
            // Get relative path for display
            const relPath = path.relative(repoPath, file);
            impactedTests.push({
                testName: relPath.replace(/\\/g, '/'), // forward slash for consistency
                changeType: type
            });
        }
    }

    return impactedTests;
}
