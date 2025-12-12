import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/tests/comparison/test-cases/**/*.test.js',
	// Use shorter user-data-dir to avoid macOS socket path length issues (103 char limit)
	launchArgs: ['--user-data-dir=/tmp/vscode-test-harness'],
	mocha: {
		timeout: 10000 // Increased from default 2000ms for slower CI environments (especially macOS)
	}
});
