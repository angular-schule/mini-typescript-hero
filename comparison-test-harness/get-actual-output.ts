/**
 * Helper script to get ACTUAL output from old extension
 *
 * Usage: Modify the input/config below and run with ts-node
 */

import { organizeImportsOld } from './old-extension/adapter';

async function getActualOutput() {
  const input = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;

  const config = {
    organizeSortsByFirstSpecifier: true
  };

  const result = await organizeImportsOld(input, config);

  console.log('=== ACTUAL OUTPUT FROM OLD EXTENSION ===');
  console.log(result);
  console.log('=== END OUTPUT ===');
}

getActualOutput().catch(console.error);
