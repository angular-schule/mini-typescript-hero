"use strict";
/**
 * Adapter for Old TypeScript Hero
 *
 * This adapter provides a standalone function interface to the old extension.
 * It uses the REAL production code from ../old-typescript-hero/src/ with mocked VSCode dependencies.
 *
 * APPROACH:
 * - Import actual ImportManager from ../old-typescript-hero/src/
 * - Create minimal mock implementations of required dependencies
 * - Reference real code via relative paths (no copying!)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizeImportsOld = organizeImportsOld;
require("reflect-metadata");
const typescript_parser_1 = require("typescript-parser");
const vscode_1 = require("vscode");
const import_manager_1 = require("../old-typescript-hero/src/imports/import-manager");
const configuration_1 = require("../old-typescript-hero/src/configuration");
const imports_config_1 = require("../old-typescript-hero/src/configuration/imports-config");
const utility_functions_1 = require("../old-typescript-hero/src/utilities/utility-functions");
const import_group_setting_parser_1 = require("../old-typescript-hero/src/imports/import-grouping/import-group-setting-parser");
/**
 * Mock TextDocument for old extension
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
        this.eol = eol;
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
            offset += lines[i].length + 1;
        }
        offset += position.character;
        return offset;
    }
    positionAt(offset) {
        const lines = this.content.split('\n');
        let currentOffset = 0;
        for (let line = 0; line < lines.length; line++) {
            const lineLength = lines[line].length + 1;
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
 * Mock Logger for old extension
 */
class MockLogger {
    debug(..._args) {
        // Silent logging
    }
    info(..._args) { }
    warn(..._args) { }
    error(..._args) { }
}
/**
 * Mock Configuration for old extension
 */
class MockConfiguration extends configuration_1.Configuration {
    imports = new MockImportsConfig();
    constructor() {
        // Create minimal ExtensionContext mock
        const mockContext = {
            subscriptions: []
        };
        super(mockContext);
    }
    typescriptGeneratorOptions(resource) {
        return {
            eol: this.imports.insertSemicolons(resource) ? ';' : '',
            insertSpaces: true,
            multiLineTrailingComma: this.imports.multiLineTrailingComma(resource),
            multiLineWrapThreshold: this.imports.multiLineWrapThreshold(resource),
            spaceBraces: this.imports.insertSpaceBeforeAndAfterImportBraces(resource),
            stringQuoteStyle: this.imports.stringQuoteStyle(resource),
            tabSize: 2,
            wrapMethod: 1, // MultiLineImportRule.oneImportPerLineOnlyAfterThreshold
        };
    }
}
/**
 * Mock ImportsConfig for old extension
 */
class MockImportsConfig extends imports_config_1.ImportsConfig {
    insertSpaceBeforeAndAfterImportBraces(_resource) {
        return true;
    }
    insertSemicolons(_resource) {
        return true;
    }
    removeTrailingIndex(_resource) {
        return true;
    }
    stringQuoteStyle(_resource) {
        return '\'';
    }
    multiLineWrapThreshold(_resource) {
        return 125;
    }
    multiLineTrailingComma(_resource) {
        return true;
    }
    disableImportRemovalOnOrganize(_resource) {
        return true; // Disable removal since typescript-parser doesn't detect usage in test environment
    }
    disableImportsSorting(_resource) {
        return false;
    }
    organizeOnSave(_resource) {
        return false;
    }
    organizeSortsByFirstSpecifier(_resource) {
        return false;
    }
    ignoredFromRemoval(_resource) {
        return ['react'];
    }
    grouping(_resource) {
        // Return default grouping: Plains, Modules, Workspace, Remain
        return import_group_setting_parser_1.ImportGroupSettingParser.default;
    }
}
/**
 * Helper function to apply TextEdits to a string
 */
function applyEdits(content, edits) {
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
            const line = lines[startLine] || '';
            lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
        }
        else {
            const firstLine = (lines[startLine] || '').substring(0, startChar);
            const lastLine = (lines[endLine] || '').substring(endChar);
            const newLines = edit.newText.split('\n');
            lines.splice(startLine, endLine - startLine + 1, firstLine + newLines[0], ...newLines.slice(1, -1), newLines[newLines.length - 1] + lastLine);
        }
    }
    return lines.join('\n');
}
/**
 * Organize imports using OLD TypeScript Hero extension
 *
 * This uses the REAL old extension code with mocked VSCode dependencies.
 */
async function organizeImportsOld(sourceCode, _config = {}) {
    // Parse with typescript-parser
    const parser = new typescript_parser_1.TypescriptParser();
    const parsedDocument = await parser.parseSource(sourceCode, (0, utility_functions_1.getScriptKind)('test.ts'));
    // Create mocks
    const doc = new MockTextDocument('test.ts', sourceCode);
    const config = new MockConfiguration();
    const logger = new MockLogger();
    // Create generator factory
    const generatorFactory = (resource) => {
        return new typescript_parser_1.TypescriptCodeGenerator(config.typescriptGeneratorOptions(resource));
    };
    // Create ImportManager (using REAL old extension code)
    const manager = new import_manager_1.ImportManager(doc, parsedDocument, parser, config, logger, generatorFactory);
    // Organize imports
    manager.organizeImports();
    // WORKAROUND: The old extension has a bug in calculateTextEdits() where it tries to
    // generate ImportGroup objects instead of Import objects. We manually generate the
    // output here to work around the bug.
    const generator = generatorFactory(doc.uri);
    const importGroups = manager.importGroups;
    const groupOutputs = [];
    for (const group of importGroups) {
        const importsInGroup = group.sortedImports;
        if (importsInGroup.length > 0) {
            const generatedImports = importsInGroup
                .map((imp) => generator.generate(imp))
                .filter(Boolean);
            if (generatedImports.length > 0) {
                groupOutputs.push(generatedImports.join('\n'));
            }
        }
    }
    const organizedImports = groupOutputs.join('\n\n');
    // Find import region in original source
    let importStart = sourceCode.length;
    let importEnd = 0;
    for (const imp of parsedDocument.imports) {
        if (imp.start !== undefined && imp.start < importStart) {
            importStart = imp.start;
        }
        if (imp.end !== undefined && imp.end > importEnd) {
            importEnd = imp.end;
        }
    }
    // Replace imports region
    if (parsedDocument.imports.length > 0) {
        // Find the line after imports to preserve spacing
        const lines = sourceCode.split('\n');
        const importEndPos = doc.positionAt(importEnd);
        let endLine = importEndPos.line + 1;
        // Skip empty lines after imports
        while (endLine < lines.length && lines[endLine].trim() === '') {
            endLine++;
        }
        const beforeImports = sourceCode.substring(0, importStart);
        const afterImports = lines.slice(endLine).join('\n');
        return beforeImports + organizedImports + '\n\n' + afterImports;
    }
    return organizedImports + '\n\n' + sourceCode;
}
//# sourceMappingURL=adapter.js.map