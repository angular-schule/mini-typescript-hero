/**
 * MANUAL PROOF TEST
 *
 * This test demonstrates what the old extension actually outputs
 * Run: npm test
 * Look at the console output to see EXACTLY what each extension produces
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('MANUAL PROOF - Multiline Wrapping Bug', () => {
  test('PROOF: Test 093 - Old extension output with multiLineWrapThreshold: 40', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = { multiLineWrapThreshold: 40 };

    console.log('\n\n========================================');
    console.log('PROOF TEST: Multiline Wrapping');
    console.log('========================================');
    console.log('\nINPUT:');
    console.log(input);
    console.log('\nCONFIG:', JSON.stringify(config));

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    console.log('\n--- OLD EXTENSION OUTPUT ---');
    console.log(oldResult);
    console.log('\n--- OLD EXTENSION OUTPUT (escaped) ---');
    console.log(JSON.stringify(oldResult));

    console.log('\n--- NEW EXTENSION OUTPUT ---');
    console.log(newResult);
    console.log('\n--- NEW EXTENSION OUTPUT (escaped) ---');
    console.log(JSON.stringify(newResult));

    console.log('\n--- ANALYSIS ---');
    if (oldResult.includes(',\n}') && !oldResult.includes('VeryLongName1')) {
      console.log('❌ OLD EXTENSION: Outputs broken code (no specifiers)');
    } else {
      console.log('✅ OLD EXTENSION: Has all specifiers');
    }

    if (newResult.includes('VeryLongName1') && newResult.includes('VeryLongName2') && newResult.includes('VeryLongName3')) {
      console.log('✅ NEW EXTENSION: Has all specifiers');
    } else {
      console.log('❌ NEW EXTENSION: Missing specifiers');
    }

    console.log('\n========================================\n');

    // This test is for demonstration only - we expect them to differ
    // Don't assert equality - just show the output
  });
});
