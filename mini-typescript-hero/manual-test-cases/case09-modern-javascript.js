// Test Case 9: Modern JavaScript features
// Expected: Keep map, filter, reduce, UsedClass
// Expected: Remove unused, tap, flatMap

import { map, filter, reduce, unused, tap, flatMap } from 'lodash';
import { UsedClass } from './helpers/used-class';

const data = [1, 2, 3, 4, 5];

// Arrow functions
const doubled = map(data, x => x * 2);

// Destructuring and chaining
const result = filter(doubled, x => x > 5)
  .reduce((acc, val) => acc + val, 0);

// Class instantiation
const instance = new UsedClass();

// Nested arrow functions
const transform = (arr) => map(arr, (item) =>
  filter([item], (x) => x > 0)
);

export { result, instance, transform };
