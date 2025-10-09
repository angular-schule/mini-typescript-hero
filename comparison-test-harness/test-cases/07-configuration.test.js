"use strict";
/**
 * Test Suite 7: Configuration Options
 * Tests all configuration options: quotes, semicolons, spacing, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const adapter_1 = require("../old-extension/adapter");
const adapter_2 = require("../new-extension/adapter");
suite('Configuration', () => {
    test('087. Single quotes (default)', async () => {
        const input = `import { A } from "./lib";

const x = A;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 087: Quote style ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should use single quotes by default');
    });
    test('088. Double quotes', async () => {
        const input = `import { A } from './lib';

const x = A;
`;
        const config = { stringQuoteStyle: '"' };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Should use double quotes when configured');
    });
    test('089. Semicolons enabled (default)', async () => {
        const input = `import { A } from './lib'

const x = A;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Should add semicolons by default');
    });
    test('090. Semicolons disabled', async () => {
        const input = `import { A } from './lib';

const x = A;
`;
        const config = { insertSemicolons: false };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 090: No semicolons ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should omit semicolons when disabled');
    });
    test('091. Space in braces enabled (default)', async () => {
        const input = `import {A} from './lib';

const x = A;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Should add spaces in braces by default');
    });
    test('092. Space in braces disabled', async () => {
        const input = `import { A } from './lib';

const x = A;
`;
        const config = { insertSpaceBeforeAndAfterImportBraces: false };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 092: No spaces ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should omit spaces when disabled');
    });
    test('093. Multiline wrapping with threshold', async () => {
        const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;
        const config = { multiLineWrapThreshold: 40 };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 093: Multiline ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should wrap to multiline when threshold exceeded');
    });
    test('094. Trailing comma in multiline (enabled)', async () => {
        const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;
        const config = {
            multiLineWrapThreshold: 40,
            multiLineTrailingComma: true,
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Should add trailing comma in multiline');
    });
    test('095. Trailing comma disabled', async () => {
        const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;
        const config = {
            multiLineWrapThreshold: 40,
            multiLineTrailingComma: false,
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 095: No trailing comma ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should omit trailing comma when disabled');
    });
    test('096. Combined config options', async () => {
        const input = `import {A,B} from "./lib"

const x = A;
const y = B;
`;
        const config = {
            stringQuoteStyle: '"',
            insertSemicolons: false,
            insertSpaceBeforeAndAfterImportBraces: false,
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 096: Combined config ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Multiple config options should work together');
    });
    test('097. disableImportsSorting', async () => {
        const input = `import { Z } from './z';
import { A } from './a';

const x = A;
const y = Z;
`;
        const config = { disableImportsSorting: true };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Should preserve order when sorting disabled');
    });
    test('098. disableImportRemovalOnOrganize', async () => {
        const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;
        const config = { disableImportRemovalOnOrganize: true };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Should keep unused imports when removal disabled');
    });
    test('099. organizeSortsByFirstSpecifier', async () => {
        const input = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;
        const config = { organizeSortsByFirstSpecifier: true };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 099: Sort by first specifier ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should sort by first specifier instead of module name');
    });
    test('100. All config options together', async () => {
        const input = `import {zoo,ant} from "./a"
import {Unused} from "./unused"

const x = ant;
const y = zoo;
`;
        const config = {
            stringQuoteStyle: '"',
            insertSemicolons: false,
            insertSpaceBeforeAndAfterImportBraces: true,
            organizeSortsByFirstSpecifier: true,
            disableImportRemovalOnOrganize: true,
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 100: All options ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'All config options should work together');
    });
});
//# sourceMappingURL=07-configuration.test.js.map