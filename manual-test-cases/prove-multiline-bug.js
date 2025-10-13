// Programmatic proof of multiline wrapping issue
//
// RUN THIS: node manual-test-cases/prove-multiline-bug.js
//
// This script uses the test harness adapters to show exactly what
// the old extension outputs vs what the new extension outputs

const path = require('path');

// Change to comparison-test-harness directory
process.chdir(path.join(__dirname, '..', 'comparison-test-harness'));

// Import adapters
const { organizeImportsOld } = require('./out/comparison-test-harness/old-extension/adapter');
const { organizeImportsNew } = require('./out/comparison-test-harness/new-extension/adapter');

const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

const config = { multiLineWrapThreshold: 40 };

console.log('=== INPUT ===');
console.log(input);
console.log('\n=== CONFIG ===');
console.log(JSON.stringify(config, null, 2));

async function test() {
  console.log('\n=== OLD EXTENSION OUTPUT ===');
  const oldResult = await organizeImportsOld(input, config);
  console.log(oldResult);
  console.log('\nOLD OUTPUT (JSON):');
  console.log(JSON.stringify(oldResult));

  console.log('\n=== NEW EXTENSION OUTPUT ===');
  const newResult = await organizeImportsNew(input, config);
  console.log(newResult);
  console.log('\nNEW OUTPUT (JSON):');
  console.log(JSON.stringify(newResult));

  console.log('\n=== ANALYSIS ===');
  if (oldResult.includes('import {\n,\n}')) {
    console.log('❌ OLD EXTENSION BUG CONFIRMED: Outputs broken code `import { , } from`');
  } else if (oldResult.includes('VeryLongName1') && oldResult.includes('VeryLongName2')) {
    console.log('✅ OLD EXTENSION WORKS: All specifiers present');
  }

  if (newResult.includes('VeryLongName1') && newResult.includes('VeryLongName2') && newResult.includes('VeryLongName3')) {
    console.log('✅ NEW EXTENSION WORKS: All specifiers present');
  } else {
    console.log('❌ NEW EXTENSION BUG: Specifiers missing');
  }

  console.log('\n=== MATCH? ===');
  console.log(oldResult === newResult ? 'YES' : 'NO');
}

test().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
