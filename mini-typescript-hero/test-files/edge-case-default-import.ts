// Edge Case 6: Default imports
// Expected: Keep only if default import is actually used

import React from 'react';
import Vue from 'vue';
import Angular from '@angular/core';

// React is used
const element = React.createElement('div');

// Vue is NOT used
// Angular is NOT used

// EXPECTED RESULT after organize imports:
// import React from 'react';
