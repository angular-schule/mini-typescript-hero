// Test Case 2: Import grouping and sorting
// Expected: Group into Plains -> Modules -> Workspace with blank lines
// Expected: Sort alphabetically within each group

import { UsedClass } from './helpers/used-class';
import { map, filter } from 'rxjs/operators';
import { Component, OnInit } from '@angular/core';
import 'zone.js';
import * as React from 'react';
import { helper } from './utils/helper';

class MyComponent implements OnInit {
  private used: UsedClass;

  ngOnInit(): void {
    map((x: number) => x);
    filter((x: number) => x > 0);
    helper();
  }
}

const element = React.createElement('div');
