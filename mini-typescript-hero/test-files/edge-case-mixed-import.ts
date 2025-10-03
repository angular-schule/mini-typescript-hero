// Edge Case 7: Mixed default + named imports
// Expected: Keep default if used, keep only used named imports

import React, { Component, useState, useEffect, useMemo } from 'react';
import Vue, { ref, computed, watch } from 'vue';

// From react: React and useState are used
const MyComponent = () => {
  const [state, setState] = useState(0);
  return React.createElement('div');
};

// From vue: only ref is used (Vue default is NOT used)
const myRef = ref(0);

// EXPECTED RESULT after organize imports:
// import React, { useState } from 'react';
// import { ref } from 'vue';
