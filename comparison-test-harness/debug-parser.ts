import { TypescriptParser } from 'typescript-parser';

async function testCase(name: string, sourceCode: string) {
  console.log(`\n======= ${name} =======`);
  const parser = new TypescriptParser();
  const parsed = await parser.parseSource(sourceCode);
  console.log('Usages:', parsed.usages);
  console.log('NonLocalUsages:', parsed.nonLocalUsages);
}

async function debugParser() {
  await testCase('Original (+ operator)', `
import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';
export function demo() {
  return VeryLongName1 + VeryLongName2 + VeryLongName3;
}`);

  await testCase('Separate statements', `
import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';
export function demo() {
  VeryLongName1;
  VeryLongName2;
  VeryLongName3;
}`);

  await testCase('Array literal', `
import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';
export function demo() {
  return [VeryLongName1, VeryLongName2, VeryLongName3];
}`);

  await testCase('Function call', `
import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';
export function demo() {
  return foo(VeryLongName1, VeryLongName2, VeryLongName3);
}`);
}

debugParser().catch(console.error);
