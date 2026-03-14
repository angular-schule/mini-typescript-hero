// Test Case 6: TypeScript React (TSX)
// Expected: Keep React, useState, Button, helper
// Expected: Remove unused, UnusedComponent

import React, { useState } from 'react';
import { Button } from './components/Button';
import { UnusedComponent } from './components/Unused';
import { helper } from './utils/helper';
import { unused } from './utils/unused';

export const MyComponent: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <Button onClick={() => setCount(count + 1)}>
        {helper('Click me')}
      </Button>
    </div>
  );
};
