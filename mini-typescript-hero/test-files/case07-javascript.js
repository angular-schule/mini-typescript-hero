// Test Case 7: JavaScript (.js)
// Expected: Keep used, UsedClass
// Expected: Remove unused, AnotherUnused

import { used } from './helpers/used';
import { unused } from './helpers/unused';
import { UsedClass } from './helpers/used-class';
import { AnotherUnused } from './helpers/another-unused';

function myFunction() {
  const instance = new UsedClass();
  return used(instance);
}

export default myFunction;
