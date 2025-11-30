import { defineConfig } from '@vscode/test-cli';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: path.join(__dirname, 'test-workspaces/single-root'),
	// Use shorter user-data-dir to avoid macOS socket path length issues (103 char limit)
	launchArgs: ['--user-data-dir=/tmp/vscode-test-data'],
	mocha: {
		timeout: 10000, // Increased from default 2000ms for slower CI environments (especially macOS)
		parallel: false, // Disable parallel execution - tests share workspace and can't run safely in parallel
		jobs: 1 // Force single worker (CLI defaults to cpus().length - 1)
	}
});
