// Edge Case 3: Partial usage from same import
// Expected: Only USED symbols should be kept

import { Component, OnInit, OnDestroy, AfterViewInit, DoCheck } from '@angular/core';
import { map, filter, tap, switchMap, mergeMap } from 'rxjs/operators';

// Only Component and OnInit are used
class MyComponent implements OnInit {
  ngOnInit(): void {
    console.log('init');
  }
}

// Only map and filter are used
const fn = (x: number) => {
  map((y: number) => y * 2);
  filter((y: number) => y > 0);
};

// EXPECTED RESULT after organize imports:
// import { Component, OnInit } from '@angular/core';
// import { filter, map } from 'rxjs/operators';
// (Note: alphabetically sorted within each import!)
