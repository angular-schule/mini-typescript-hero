// Edge Case 2: Imports used only in type annotations
// Expected: ALL imports should be KEPT (type annotations count as usage)

import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

// Component used only as type annotation
let comp: Component;

// Observable used in function signature
function process(obs: Observable<number>): void {
  console.log('processing');
}

// HttpClient used in class property type
class MyClass {
  private http: HttpClient;
}

// EXPECTED RESULT after organize imports:
// All imports should remain (types count as usage!)
// import { Component } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
