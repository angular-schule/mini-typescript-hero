// Edge Case 1: Local declaration shadows imported symbol
// Expected: Component import should be REMOVED (local declaration takes precedence)
// Expected: Injectable import should be KEPT (actually used from @angular/core)

import { Component, Injectable } from '@angular/core';

// Local class shadows the imported Component
class Component {
  name = 'local';
}

// Using LOCAL Component, not the imported one
const instance = new Component();
console.log(instance.name);

// Injectable is actually used from the import (as decorator)
@Injectable()
class MyService {
  // This class uses the IMPORTED Injectable
}

// EXPECTED RESULT after organize imports:
// import { Injectable } from '@angular/core';
