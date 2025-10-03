// Edge Case 4: Aliased imports
// Expected: Detect usage by ALIAS name, not original name

import { Component as AngularComponent, Injectable as Inject } from '@angular/core';
import { Observable as Obs } from 'rxjs';

// Used by alias
const comp: AngularComponent = {} as AngularComponent;

// Inject is imported but NOT used
// Obs is imported but NOT used

// EXPECTED RESULT after organize imports:
// import { Component as AngularComponent } from '@angular/core';
