// Test Case 3: Type-only imports
// Expected: Keep Component, Observable, HttpClient (used in type annotations)
// Expected: Remove UnusedType (not used)

import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface DataResponse {
  id: number;
  name: string;
}

class MyComponent implements OnInit {
  data$: Observable<DataResponse>;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.data$ = this.http.get<DataResponse>('/api/data');
  }

  process(comp: Component): void {
    console.log(comp);
  }
}
