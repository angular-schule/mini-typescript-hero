// Test Case 3: Type-only imports
// Expected: Keep Component, Observable, HttpClient (used in type annotations)
// Expected: Remove UnusedType (not used)

import { Component, OnInit, UnusedType } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

class MyComponent implements OnInit {
  data$: Observable<any>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.data$ = this.http.get('/api/data');
  }

  process(comp: Component): void {
    console.log(comp);
  }
}
