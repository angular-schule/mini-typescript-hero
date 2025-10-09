"use strict";
/**
 * Test Suite 4: Unused Import Removal
 * Tests removal of unused imports and ignoredFromRemoval list
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const adapter_1 = require("../old-extension/adapter");
const adapter_2 = require("../new-extension/adapter");
suite('Removal', () => {
    test('044. Remove completely unused import', async () => {
        const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 044: Remove unused ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Completely unused import should be removed');
    });
    test('045. Remove unused specifiers, keep used ones', async () => {
        const input = `import { Used, Unused1, Unused2 } from './lib';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Only used specifiers should be kept');
    });
    test('046. Type-only imports are considered used', async () => {
        const input = `import { MyType } from './lib';

let x: MyType;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Type-only usage counts as used');
    });
    test('047. ignoredFromRemoval list honored', async () => {
        const input = `import React from 'react';

// React not used but should be kept
const x = 1;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 047: ignoredFromRemoval ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'React should be kept even when unused (ignoredFromRemoval)');
    });
    test('048. Custom ignoredFromRemoval config', async () => {
        const input = `import { CustomLib } from 'custom-lib';
import { Other } from 'other';

// Neither used, but CustomLib should be kept
const x = 1;
`;
        const config = {
            ignoredFromRemoval: ['custom-lib'],
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Custom ignoredFromRemoval should be honored');
    });
    test('049. Default import unused', async () => {
        const input = `import Lib from './lib';
import { Used } from './other';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Unused default import should be removed');
    });
    test('050. Namespace import unused', async () => {
        const input = `import * as Lib from './lib';
import { Used } from './other';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Unused namespace import should be removed');
    });
    test('051. String imports always kept', async () => {
        const input = `import './side-effects';
import { Used } from './lib';

const x = Used;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'String imports should always be kept');
    });
    test('052. Remove unused in re-export', async () => {
        const input = `import { A, B } from './lib';

export { A };
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Unused specifiers in re-export should be removed');
    });
    test('053. Keep all re-exported symbols', async () => {
        const input = `import { A, B, C } from './lib';

export { A, B };
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'All re-exported symbols should be kept');
    });
    test('054. Property access vs function call', async () => {
        const input = `import { map, reduce } from 'lodash';

const arr = [1, 2, 3];
const doubled = map(arr, x => x * 2);
const sum = doubled.reduce((a, b) => a + b, 0);
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 054: Property access ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Property access should not count as import usage');
    });
    test('055. Local shadowing', async () => {
        const input = `import { Component } from '@angular/core';
import { Injectable } from '@angular/core';

class Component {}

const x = Injectable;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Local declarations should shadow imports');
    });
    test('056. Disable removal', async () => {
        const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;
        const config = {
            disableImportRemovalOnOrganize: true,
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'All imports should be kept when removal disabled');
    });
    test('057. Partial default + named removal', async () => {
        const input = `import Lib, { UsedNamed, UnusedNamed } from './lib';

const x = UsedNamed;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 057: Partial removal ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should remove unused default and unused named specifiers');
    });
});
//# sourceMappingURL=04-removal.test.js.map