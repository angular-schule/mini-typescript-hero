// Test Case 4: Local shadowing
// Expected: Remove Component import (local class shadows it)
// Expected: Keep Injectable (actually used from @angular/core)

import { Component, Injectable } from '@angular/core';

// Local declaration shadows the imported Component
class Component {
  name = 'local';
}

@Injectable()
class MyService {
  private comp = new Component(); // Uses LOCAL Component, not imported one
}
