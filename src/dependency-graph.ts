import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import glob from 'glob';

// Map: filePath -> Set of filePaths that import it
export type DependencyGraph = Map<string, Set<string>>;

export function buildDependencyGraph(repoPath: string): DependencyGraph {
    const project = new Project({
        tsConfigFilePath: path.join(repoPath, 'tsconfig.json'),
        skipAddingFilesFromTsConfig: false,
    });

    // If tsconfig doesn't exist or we want to be safe, add source files manually
    if (!fs.existsSync(path.join(repoPath, 'tsconfig.json'))) {
        project.addSourceFilesAtPaths([
            path.join(repoPath, '**/*.ts'),
            path.join(repoPath, '**/*.tsx'),
            path.join(repoPath, '**/*.js'),
            path.join(repoPath, '**/*.jsx'),
            `!${path.join(repoPath, 'node_modules/**/*')}`
        ]);
    }

    const graph: DependencyGraph = new Map();
    const sourceFiles = project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
        const filePath = path.resolve(sourceFile.getFilePath());

        // Initialize entry in graph
        if (!graph.has(filePath)) {
            graph.set(filePath, new Set());
        }

        // Find imports
        const imports = sourceFile.getImportDeclarations();
        for (const imp of imports) {
            const moduleSpecifier = imp.getModuleSpecifierSourceFile();
            if (moduleSpecifier) {
                const importedFilePath = path.resolve(moduleSpecifier.getFilePath());

                // Add reverse dependency: importedFilePath -> filePath (the importer)
                if (!graph.has(importedFilePath)) {
                    graph.set(importedFilePath, new Set());
                }
                graph.get(importedFilePath)?.add(filePath);
            }
        }

        // Also handle export ... from ...
        const exports = sourceFile.getExportDeclarations();
        for (const exp of exports) {
            const moduleSpecifier = exp.getModuleSpecifierSourceFile();
            if (moduleSpecifier) {
                const exportedFilePath = path.resolve(moduleSpecifier.getFilePath());
                if (!graph.has(exportedFilePath)) {
                    graph.set(exportedFilePath, new Set());
                }
                graph.get(exportedFilePath)?.add(filePath);
            }
        }
    }

    return graph;
}
