import simpleGit from 'simple-git';
import path from 'path';

export interface Change {
    file: string; // Relative path
    status: 'added' | 'modified' | 'deleted';
}

export async function getChangedFiles(repoPath: string, sha: string): Promise<Change[]> {
    // Configure simple-git to use the local git binary
    const git = simpleGit({
        baseDir: repoPath,
        binary: 'C:\\Program Files\\Git\\cmd\\git.exe',
        unsafe: { allowUnsafeCustomBinary: true }
    });

    // Use git diff-tree to get changed files for the commit
    // -r: recurse into sub-trees
    // --no-commit-id: suppress commit ID output
    // --name-status: show only names and status of changed files
    const diff = await git.raw(['diff-tree', '--no-commit-id', '--name-status', '-r', sha]);

    const changes: Change[] = [];
    const lines = diff.trim().split('\n');

    for (const line of lines) {
        if (!line) continue;
        const [status, filePath] = line.split(/\s+/);

        // Status can be M (modified), A (added), D (deleted), R (renamed)
        // For R, it might look like R100 old new. We simplistically handle M, A, D.
        // In case of rename, git diff-tree --name-status outputs: R100 old_path new_path

        let normalizedStatus: 'added' | 'modified' | 'deleted' = 'modified';
        let file = filePath;

        if (status.startsWith('A')) {
            normalizedStatus = 'added';
        } else if (status.startsWith('D')) {
            normalizedStatus = 'deleted';
        } else if (status.startsWith('R')) {
            // Handle rename: The second path is the new filename
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                file = parts[2];
            }
        }

        changes.push({ file, status: normalizedStatus });
    }

    return changes;
}
