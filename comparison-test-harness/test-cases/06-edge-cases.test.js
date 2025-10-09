"use strict";
/**
 * Test Suite 6: Edge Cases
 * Tests unusual scenarios, malformed code, and boundary conditions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const adapter_1 = require("../old-extension/adapter");
const adapter_2 = require("../new-extension/adapter");
suite('Edge Cases', () => {
    test('071. Empty file', async () => {
        const input = ``;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Empty file should remain empty');
    });
    test('072. File with no imports', async () => {
        const input = `const x = 1;
const y = 2;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'File without imports should remain unchanged');
    });
    test('073. Only string imports', async () => {
        const input = `import 'zone.js';
import 'reflect-metadata';
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        // Handle EOF blank line difference
        const oldTrimmed = oldResult.replace(/\n\n$/, '\n');
        assert_1.strict.equal(newResult, oldTrimmed, 'Only string imports should be handled correctly');
    });
    test('074. Only default imports', async () => {
        const input = `import Lib1 from './lib1';
import Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Only default imports should be sorted');
    });
    test('075. Only namespace imports', async () => {
        const input = `import * as Lib1 from './lib1';
import * as Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Only namespace imports should be sorted');
    });
    test('076. Long import line (multiline wrapping)', async () => {
        const input = `import { VeryLongSpecifierName1, VeryLongSpecifierName2, VeryLongSpecifierName3, VeryLongSpecifierName4, VeryLongSpecifierName5 } from './lib';

const a = VeryLongSpecifierName1;
const b = VeryLongSpecifierName2;
const c = VeryLongSpecifierName3;
const d = VeryLongSpecifierName4;
const e = VeryLongSpecifierName5;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 076: Long import ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Long import lines should be handled correctly');
    });
    test('077. Path aliases', async () => {
        const input = `import { Service } from '@app/services/my-service';
import { Utils } from '@utils/helpers';
import { Component } from '@angular/core';

const x = Component;
const y = Service;
const z = Utils;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 077: Path aliases ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Path aliases should be treated as modules');
    });
    test('078. removeTrailingIndex enabled', async () => {
        const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 078: Remove /index ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, '/index should be removed and imports merged');
    });
    test('079. removeTrailingIndex disabled', async () => {
        const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;
        const config = { removeTrailingIndex: false };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, '/index should be kept when disabled');
    });
    test('080. Dynamic import() not confused with static import', async () => {
        const input = `import { A } from './lib';

const x = A;
const y = import('./dynamic');
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Dynamic import() should not be confused with static imports');
    });
    test('081. import.meta not confused with imports', async () => {
        const input = `import { A } from './lib';

const x = A;
const url = import.meta.url;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'import.meta should not be confused with imports');
    });
    test('082. Empty import specifiers', async () => {
        const input = `import {} from './lib';
import { Used } from './other';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 082: Empty specifiers ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Empty import specifiers should be removed');
    });
    test('083. Comments between imports', async () => {
        const input = `import { A } from './a';
// Important comment
import { B } from './b';

const x = A;
const y = B;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 083: Comments between ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Comments between imports should be handled');
    });
    test('084. Template string with import keyword', async () => {
        const input = `import { A } from './lib';

const x = A;
const str = \`import { B } from 'fake'\`;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Template strings with import keyword should not be confused');
    });
    test('085. Triple-slash directive', async () => {
        const input = `/// <reference types="node" />
import { A } from './lib';

const x = A;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 085: Triple-slash ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Triple-slash directives should be preserved');
    });
    test('086. Type-only import syntax', async () => {
        const input = `import type { MyType } from './lib';
import { MyValue } from './lib';

const x = MyValue;
let y: MyType;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 086: Type-only import ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Type-only import syntax should be handled');
    });
});
//# sourceMappingURL=06-edge-cases.test.js.map