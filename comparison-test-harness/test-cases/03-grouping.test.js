"use strict";
/**
 * Test Suite 3: Import Grouping
 * Tests Plains → Modules → Workspace grouping with blank lines
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const adapter_1 = require("../old-extension/adapter");
const adapter_2 = require("../new-extension/adapter");
suite('Grouping', () => {
    test('028. Plains (string imports) first', async () => {
        const input = `import { Component } from '@angular/core';
import 'zone.js';

const x = Component;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 028: Plains first ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'String imports should be in Plains group (first)');
    });
    test('029. Modules (external packages)', async () => {
        const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { useState } from 'react';

const x = Component;
const y = map;
const z = useState;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'External packages should be in Modules group');
    });
    test('030. Workspace (relative imports)', async () => {
        const input = `import { MyService } from './my-service';
import { Utils } from '../utils';

const x = MyService;
const y = Utils;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Relative imports should be in Workspace group');
    });
    test('031. Plains → Modules with blank line', async () => {
        const input = `import 'zone.js';
import { Component } from '@angular/core';

const x = Component;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 031: Plains → Modules ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should have blank line between Plains and Modules');
    });
    test('032. Modules → Workspace with blank line', async () => {
        const input = `import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 032: Modules → Workspace ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should have blank line between Modules and Workspace');
    });
    test('033. All three groups: Plains → Modules → Workspace', async () => {
        const input = `import { MyService } from './my-service';
import { Component } from '@angular/core';
import 'zone.js';

const x = Component;
const y = MyService;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 033: All three groups ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Should have proper grouping: Plains → Modules → Workspace');
    });
    test('034. Scoped packages in Modules group', async () => {
        const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { Injectable } from '@angular/core';

const x = Component;
const y = Injectable;
const z = map;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Scoped packages should be in Modules group');
    });
    test('035. Sorting within Modules group', async () => {
        const input = `import { z } from 'zebra';
import { a } from 'aardvark';
import { m } from 'monkey';

const x = a;
const y = m;
const w = z;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Modules should be sorted alphabetically within group');
    });
    test('036. Sorting within Workspace group', async () => {
        const input = `import { Z } from './z';
import { A } from './a';
import { M } from '../m';

const x = A;
const y = M;
const z = Z;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Workspace imports should be sorted alphabetically');
    });
    test('037. Custom regex group', async () => {
        const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { MyService } from './my-service';

const x = Component;
const y = map;
const z = MyService;
`;
        const config = {
            grouping: ['Plains', '/^@angular/', 'Modules', 'Workspace'],
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        console.log('\n=== TEST 037: Custom regex group ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Custom regex group should work');
    });
    test('038. Regex group precedence over keyword', async () => {
        const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';

const x = Component;
const y = map;
`;
        const config = {
            grouping: ['/^@angular/', 'Modules'],
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Regex groups should have precedence over keywords');
    });
    test('039. Empty group (no imports match)', async () => {
        const input = `import { Component } from '@angular/core';

const x = Component;
`;
        const config = {
            grouping: ['Plains', '/^never-matches/', 'Modules'],
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Empty groups should not add extra blank lines');
    });
    test('040. Multiple string imports in Plains', async () => {
        const input = `import { Component } from '@angular/core';
import 'zone.js';
import 'reflect-metadata';

const x = Component;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        assert_1.strict.equal(newResult, oldResult, 'Multiple string imports should all be in Plains group');
    });
    test('041. Path aliases should be in Modules', async () => {
        const input = `import { Service } from '@app/services';
import { Utils } from './utils';

const x = Service;
const y = Utils;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 041: Path aliases ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Path aliases (@app/*) should be in Modules group');
    });
    test('042. Remaining imports group', async () => {
        const input = `import { A } from 'pkg-a';
import { B } from 'pkg-b';

const x = A;
const y = B;
`;
        const config = {
            grouping: ['Plains', 'Remaining'],
        };
        const oldResult = await (0, adapter_1.organizeImportsOld)(input, config);
        const newResult = (0, adapter_2.organizeImportsNew)(input, config);
        assert_1.strict.equal(newResult, oldResult, 'Remaining group should catch all unmatched imports');
    });
    test('043. Complex multi-group scenario', async () => {
        const input = `import { MyComponent } from './components/my-component';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import 'zone.js';
import { map, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MyService } from '../services/my-service';

const a = Component;
const b: OnInit = null as any;
const c = HttpClient;
const d = Observable;
const e = map;
const f = filter;
const g = MyService;
const h = MyComponent;
`;
        const oldResult = await (0, adapter_1.organizeImportsOld)(input);
        const newResult = (0, adapter_2.organizeImportsNew)(input);
        console.log('\n=== TEST 043: Complex grouping ===');
        console.log('OLD OUTPUT:');
        console.log(oldResult);
        console.log('\nNEW OUTPUT:');
        console.log(newResult);
        console.log('===\n');
        assert_1.strict.equal(newResult, oldResult, 'Complex multi-group scenario should be organized correctly');
    });
});
//# sourceMappingURL=03-grouping.test.js.map