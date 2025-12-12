import { defineConfig } from '@vscode/test-cli';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	files: 'out/tests/unit/**/*.test.js',
	workspaceFolder: path.join(__dirname, 'tests/workspaces/single-root'),
	// Use short path to avoid macOS socket path length limit (103 chars)
	launchArgs: ['--user-data-dir=/tmp/mths-user-data'],
	mocha: {
		timeout: 10000 // Increased from default 2000ms for slower CI environments (especially macOS)
	}
});
