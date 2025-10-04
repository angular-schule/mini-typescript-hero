// Test Case 1: Basic unused import removal
// Expected: Remove 'unused' and 'AnotherUnused', keep 'UsedClass'

import { UsedClass } from './helpers/used-class';
import { unused } from './helpers/unused';
import { AnotherUnused } from './helpers/another-unused';

const instance = new UsedClass();
console.log(instance);
