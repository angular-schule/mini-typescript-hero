import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// Use shorter user-data-dir to avoid macOS socket path length issues (103 char limit)
	launchArgs: ['--user-data-dir=/tmp/vscode-test-data'],
});
