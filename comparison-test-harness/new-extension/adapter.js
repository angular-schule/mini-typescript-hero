"use strict";
/**
 * Adapter for Mini TypeScript Hero (New Extension)
 *
 * This adapter provides a standalone function interface to the new extension.
 * It uses the REAL production code from ../../src/ with mocked VSCode dependencies.
 *
 * APPROACH:
 * - Import actual ImportManager from ../../src/imports/import-manager
 * - Use mock implementations of VSCode types (same pattern as existing tests)
 * - Reference real code via relative paths (no copying!)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizeImportsNew = organizeImportsNew;
const vscode_1 = require("vscode");
const import_manager_1 = require("../../src/imports/import-manager");
const configuration_1 = require("../../src/configuration");
const import_grouping_1 = require("../../src/imports/import-grouping");
/**
 * Mock TextDocument (same as in existing tests)
 */
class MockTextDocument {
    content;
    uri;
    fileName;
    isUntitled = false;
    languageId = 'typescript';
    version = 1;
    isDirty = false;
    isClosed = false;
    eol;
    encoding = 'utf-8';
    lineCount;
    constructor(fileName, content, eol = 1) {
        this.content = content;
        this.fileName = fileName;
        this.uri = vscode_1.Uri.file(fileName);
        this.eol = eol; // 1 = LF, 2 = CRLF
        this.lineCount = content.split('\n').length;
    }
    save() {
        return Promise.resolve(true);
    }
    getText(range) {
        if (range) {
            const lines = this.content.split('\n');
            const result = [];
            for (let i = range.start.line; i <= range.end.line; i++) {
                if (i < lines.length) {
                    let line = lines[i];
                    if (i === range.start.line && i === range.end.line) {
                        line = line.substring(range.start.character, range.end.character);
                    }
                    else if (i === range.start.line) {
                        line = line.substring(range.start.character);
                    }
                    else if (i === range.end.line) {
                        line = line.substring(0, range.end.character);
                    }
                    result.push(line);
                }
            }
            return result.join('\n');
        }
        return this.content;
    }
    lineAt(position) {
        const lineNumber = typeof position === 'number' ? position : position.line;
        const lines = this.content.split('\n');
        const text = lines[lineNumber] || '';
        return {
            lineNumber,
            text,
            range: new vscode_1.Range(lineNumber, 0, lineNumber, text.length),
            rangeIncludingLineBreak: new vscode_1.Range(lineNumber, 0, lineNumber + 1, 0),
            firstNonWhitespaceCharacterIndex: text.search(/\S/),
            isEmptyOrWhitespace: text.trim().length === 0
        };
    }
    offsetAt(position) {
        const lines = this.content.split('\n');
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
    }
    positionAt(offset) {
        const lines = this.content.split('\n');
        let currentOffset = 0;
        for (let line = 0; line < lines.length; line++) {
            const lineLength = lines[line].length + 1; // +1 for newline
            if (currentOffset + lineLength > offset) {
                return new vscode_1.Position(line, offset - currentOffset);
            }
            currentOffset += lineLength;
        }
        return new vscode_1.Position(lines.length - 1, lines[lines.length - 1].length);
    }
    getWordRangeAtPosition(_position) {
        return undefined;
    }
    validateRange(range) {
        return range;
    }
    validatePosition(position) {
        return position;
    }
}
/**
 * Mock OutputChannel (same as in existing tests)
 */
class MockOutputChannel {
    name = 'Test';
    lines = [];
    append(value) {
        this.lines.push(value);
    }
    appendLine(value) {
        this.lines.push(value + '\n');
    }
    replace(value) {
        this.lines = [value];
    }
    clear() {
        this.lines = [];
    }
    show() { }
    hide() { }
    dispose() { }
    getOutput() {
        return this.lines.join('');
    }
}
/**
 * Mock ImportsConfig (same as in existing tests)
 */
class MockImportsConfig extends configuration_1.ImportsConfig {
    mockConfig = new Map();
    setConfig(key, value) {
        this.mockConfig.set(key, value);
    }
    insertSpaceBeforeAndAfterImportBraces(_resource) {
        return this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces') ?? true;
    }
    insertSemicolons(_resource) {
        return this.mockConfig.get('insertSemicolons') ?? true;
    }
    removeTrailingIndex(_resource) {
        return this.mockConfig.get('removeTrailingIndex') ?? true;
    }
    stringQuoteStyle(_resource) {
        return this.mockConfig.get('stringQuoteStyle') ?? '\'';
    }
    multiLineWrapThreshold(_resource) {
        return this.mockConfig.get('multiLineWrapThreshold') ?? 125;
    }
    multiLineTrailingComma(_resource) {
        return this.mockConfig.get('multiLineTrailingComma') ?? true;
    }
    disableImportRemovalOnOrganize(_resource) {
        return this.mockConfig.get('disableImportRemovalOnOrganize') ?? false;
    }
    disableImportsSorting(_resource) {
        return this.mockConfig.get('disableImportsSorting') ?? false;
    }
    organizeOnSave(_resource) {
        return this.mockConfig.get('organizeOnSave') ?? false;
    }
    organizeSortsByFirstSpecifier(_resource) {
        return this.mockConfig.get('organizeSortsByFirstSpecifier') ?? false;
    }
    ignoredFromRemoval(_resource) {
        return this.mockConfig.get('ignoredFromRemoval') ?? ['react'];
    }
    blankLinesAfterImports(_resource) {
        return this.mockConfig.get('blankLinesAfterImports') ?? 'one';
    }
    grouping(_resource) {
        const groupSettings = this.mockConfig.get('grouping') ?? ['Plains', 'Modules', 'Workspace'];
        let importGroups = [];
        try {
            importGroups = groupSettings.map((setting) => import_grouping_1.ImportGroupSettingParser.parseSetting(setting));
        }
        catch (e) {
            // Fall back to default on invalid config
            importGroups = import_grouping_1.ImportGroupSettingParser.default;
        }
        // Ensure RemainImportGroup is always present
        if (!importGroups.some(i => i instanceof import_grouping_1.RemainImportGroup)) {
            importGroups.push(new import_grouping_1.RemainImportGroup());
        }
        return importGroups;
    }
}
/**
 * Helper function to apply TextEdits to a string (same as in existing tests)
 */
function applyEdits(content, edits) {
    // Sort edits by position (descending) to apply them without affecting positions
    const sortedEdits = [...edits].sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
            return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
    });
    const lines = content.split('\n');
    for (const edit of sortedEdits) {
        const startLine = edit.range.start.line;
        const startChar = edit.range.start.character;
        const endLine = edit.range.end.line;
        const endChar = edit.range.end.character;
        if (startLine === endLine) {
            // Single line edit
            const line = lines[startLine] || '';
            lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
        }
        else {
            // Multi-line edit
            const firstLine = (lines[startLine] || '').substring(0, startChar);
            const lastLine = (lines[endLine] || '').substring(endChar);
            const newLines = edit.newText.split('\n');
            lines.splice(startLine, endLine - startLine + 1, firstLine + newLines[0], ...newLines.slice(1, -1), newLines[newLines.length - 1] + lastLine);
        }
    }
    return lines.join('\n');
}
/**
 * Organize imports using the NEW Mini TypeScript Hero extension
 *
 * This uses the REAL production code with mocked VSCode dependencies.
 */
function organizeImportsNew(sourceCode, _config = {}) {
    const doc = new MockTextDocument('test.ts', sourceCode);
    const config = new MockImportsConfig();
    const logger = new MockOutputChannel();
    const manager = new import_manager_1.ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(sourceCode, edits);
    return result;
}
//# sourceMappingURL=adapter.js.map