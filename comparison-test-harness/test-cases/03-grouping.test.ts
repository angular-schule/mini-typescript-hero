/**
 * Test Suite 3: Import Grouping
 * Tests Plains → Modules → Workspace grouping with blank lines
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Grouping', () => {
  test('028. Plains (string imports) first', async () => {
    const input = `import { Component } from '@angular/core';
import 'zone.js';

const x = Component;
`;

    const expected = `import 'zone.js';

import { Component } from '@angular/core';

const x = Component;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('029. Modules (external packages)', async () => {
    const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { useState } from 'react';

const x = Component;
const y = map;
const z = useState;
`;

    const expected = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { useState } from 'react';

const x = Component;
const y = map;
const z = useState;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('030. Workspace (relative imports)', async () => {
    const input = `import { MyService } from './my-service';
import { Utils } from '../utils';

const x = MyService;
const y = Utils;
`;

    const expected = `import { MyService } from './my-service';
import { Utils } from '../utils';

const x = MyService;
const y = Utils;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('031. Plains → Modules with blank line', async () => {
    const input = `import 'zone.js';
import { Component } from '@angular/core';

const x = Component;
`;

    const expected = `import 'zone.js';

import { Component } from '@angular/core';

const x = Component;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('032. Modules → Workspace with blank line', async () => {
    const input = `import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const expected = `import { Component } from '@angular/core';

import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('033. All three groups: Plains → Modules → Workspace', async () => {
    const input = `import { MyService } from './my-service';
import { Component } from '@angular/core';
import 'zone.js';

const x = Component;
const y = MyService;
`;

    const expected = `import 'zone.js';

import { Component } from '@angular/core';

import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('034. Scoped packages in Modules group', async () => {
    const input = `import { Component } from '@angular/core';
import { map } from 'rxjs';
import { Injectable } from '@angular/core';

const x = Component;
const y = Injectable;
const z = map;
`;

    const expected = `import { Component, Injectable } from '@angular/core';
import { map } from 'rxjs';

const x = Component;
const y = Injectable;
const z = map;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('035. Sorting within Modules group', async () => {
    const input = `import { z } from 'zebra';
import { a } from 'aardvark';
import { m } from 'monkey';

const x = a;
const y = m;
const w = z;
`;

    const expected = `import { a } from 'aardvark';
import { m } from 'monkey';
import { z } from 'zebra';

const x = a;
const y = m;
const w = z;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('036. Sorting within Workspace group', async () => {
    const input = `import { Z } from './z';
import { A } from './a';
import { M } from '../m';

const x = A;
const y = M;
const z = Z;
`;

    const expected = `import { M } from '../m';
import { A } from './a';
import { Z } from './z';

const x = A;
const y = M;
const z = Z;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { Component } from '@angular/core';

import { map } from 'rxjs';

import { MyService } from './my-service';

const x = Component;
const y = map;
const z = MyService;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { Component } from '@angular/core';

import { map } from 'rxjs';

const x = Component;
const y = map;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('039. Empty group (no imports match)', async () => {
    const input = `import { Component } from '@angular/core';

const x = Component;
`;

    const config = {
      grouping: ['Plains', '/^never-matches/', 'Modules'],
    };

    const expected = `import { Component } from '@angular/core';

const x = Component;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('040. Multiple string imports in Plains', async () => {
    const input = `import { Component } from '@angular/core';
import 'zone.js';
import 'reflect-metadata';

const x = Component;
`;

    const expected = `import 'reflect-metadata';
import 'zone.js';

import { Component } from '@angular/core';

const x = Component;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('041. Path aliases should be in Modules', async () => {
    const input = `import { Service } from '@app/services';
import { Utils } from './utils';

const x = Service;
const y = Utils;
`;

    const expected = `import { Service } from '@app/services';

import { Utils } from './utils';

const x = Service;
const y = Utils;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { A } from 'pkg-a';
import { B } from 'pkg-b';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import 'zone.js';

import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { MyService } from '../services/my-service';
import { MyComponent } from './components/my-component';

const a = Component;
const b: OnInit = null as any;
const c = HttpClient;
const d = Observable;
const e = map;
const f = filter;
const g = MyService;
const h = MyComponent;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });
});
