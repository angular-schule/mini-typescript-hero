// Test Case 5: Re-exports
// Expected: Keep Foo, Bar, MyClass (all re-exported)
// Expected: Remove Unused (not used or re-exported)

import { Foo, Bar, Unused } from './helpers/exports';
import MyClass from './helpers/my-class';

// Named re-exports
export { Foo, Bar };

// Default re-export
export default MyClass;
