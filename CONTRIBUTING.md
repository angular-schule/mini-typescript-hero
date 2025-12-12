# Contributing to Mini TypeScript Hero

Thank you for your interest in contributing! This guide covers development setup, debugging, and testing.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/angular-schule/mini-typescript-hero.git
cd mini-typescript-hero

# Install dependencies
npm install

# Compile and watch for changes
npm run watch

# Run tests
npm test
```

## Debugging & Troubleshooting

### Opening the Output Panel

1. **Open VS Code Output:** `Ctrl+`` ` (backtick) or View → Output
2. **Select "Mini TypeScript Hero"** from the channel dropdown

### What Gets Logged

- **Startup Events:** Extension activation, settings migration, conflict detection
- **Per-File Events:** Each file organized, success/failure of edits
- **Configuration Events:** Settings changes, legacy mode toggle

### Example Log Output

```
[ImportOrganizer] Activating
Mini TypeScript Hero: Extension activated successfully
[ImportOrganizer] Organizing imports for /path/to/file.ts
[ImportOrganizer] Imports organized successfully
```

### Manual Test Cases

The repository includes [10 test cases](https://github.com/angular-schule/mini-typescript-hero/tree/HEAD/manual-test-cases) covering various scenarios (unused imports, grouping, type-only imports, JSX/TSX, etc.). Use these to test configurations or create reproducible bug reports.

## Running Tests

```bash
# Main extension tests (385+ tests)
npm test

# Comparison test harness (old vs new extension)
cd comparison-test-harness
npm test
```

## Project Structure

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed
