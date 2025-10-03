// Edge Case 5: Namespace imports
// Expected: Keep if the namespace is referenced, remove if not

import * as React from 'react';
import * as RxJS from 'rxjs';
import * as Lodash from 'lodash';

// React is used
const element = React.createElement('div');

// RxJS is used
const obs = new RxJS.Observable();

// Lodash is NOT used

// EXPECTED RESULT after organize imports:
// import * as React from 'react';
// import * as RxJS from 'rxjs';
