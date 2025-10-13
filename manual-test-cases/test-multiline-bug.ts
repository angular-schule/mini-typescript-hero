// Manual test case for multiline wrapping behavior
//
// TEST INSTRUCTIONS:
// 1. Open this file in VSCode with OLD TypeScript Hero extension installed
// 2. Set this in your VSCode settings:
//    "typescriptHero.imports.multiLineWrapThreshold": 40
// 3. Run "TS Hero: Organize imports" command
// 4. Observe the result
//
// EXPECTED BEHAVIOR (if no bug): Import should wrap to multiple lines with all 3 specifiers
// ACTUAL BEHAVIOR (if bug exists): Import shows `import { , } from './lib';` with no specifiers
import {
    VeryLongName1,
    VeryLongName2,
    VeryLongName3,
} from './lib';


const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
