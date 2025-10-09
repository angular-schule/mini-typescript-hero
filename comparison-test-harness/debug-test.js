const { organizeImportsOld } = require('./out/comparison-test-harness/old-extension/adapter');
const { organizeImportsNew } = require('./out/comparison-test-harness/new-extension/adapter');

const testInput = `import { A } from './lib';
import { B } from './lib';

const x = A;
const y = B;
`;

console.log('=== INPUT ===');
console.log(testInput);

organizeImportsOld(testInput).then(oldResult => {
  console.log('\n=== OLD EXTENSION OUTPUT ===');
  console.log(oldResult);
  console.log('\n=== NEW EXTENSION OUTPUT ===');
  const newResult = organizeImportsNew(testInput);
  console.log(newResult);
  
  console.log('\n=== COMPARISON ===');
  console.log('Are they equal?', oldResult === newResult);
});
