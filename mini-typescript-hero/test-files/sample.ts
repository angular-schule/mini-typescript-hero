// Test file for Mini TypeScript Hero
// This file has messy imports that should be organized

import {UnusedImport} from "./unused"
import { Component, OnInit } from "@angular/core";
import * as React from 'react';
import {UsedClass} from './used-class'
import 'zone.js';
import { map, filter } from 'rxjs/operators';
import {AnotherUnused} from "./another-unused";

export class TestComponent implements OnInit {
  private usedInstance: UsedClass;

  ngOnInit(): void {
    map((x: number) => x * 2);
    filter((x: number) => x > 0);

    const element = React.createElement('div');
    console.log(element);
  }
}
