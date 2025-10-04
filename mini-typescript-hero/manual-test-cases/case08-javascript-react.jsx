// Test Case 8: JavaScript React (JSX)
// Expected: Keep React, Button, helper
// Expected: Remove unused, UnusedComponent

import React from 'react';
import { Button } from './components/Button';
import { UnusedComponent } from './components/Unused';
import { helper } from './utils/helper';
import { unused } from './utils/unused';

export default function MyComponent() {
  return (
    <div>
      <h1>Welcome</h1>
      <Button>{helper('Click me')}</Button>
    </div>
  );
}
