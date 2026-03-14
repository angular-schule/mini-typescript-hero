#!/bin/bash
# Script to add OLD_EXTENSION_COMPATIBLE_CONFIG to all test calls

for file in *.test.ts; do
  # Skip if already has import
  if grep -q "import.*OLD_EXTENSION_COMPATIBLE_CONFIG" "$file"; then
    echo "Skipping $file (already has import)"
    continue
  fi
  
  echo "Updating $file..."
  
  # Add import after adapter imports
  sed -i.bak '/import.*organizeImportsNew/a\
import { OLD_EXTENSION_COMPATIBLE_CONFIG } from '"'"'./shared-config'"'"';
' "$file"
  
  # Replace organizeImportsOld(input) with organizeImportsOld(input, OLD_EXTENSION_COMPATIBLE_CONFIG)
  sed -i '' 's/organizeImportsOld(input)/organizeImportsOld(input, OLD_EXTENSION_COMPATIBLE_CONFIG)/g' "$file"
  
  # Replace organizeImportsNew(input) with organizeImportsNew(input, OLD_EXTENSION_COMPATIBLE_CONFIG)
  sed -i '' 's/organizeImportsNew(input)/organizeImportsNew(input, OLD_EXTENSION_COMPATIBLE_CONFIG)/g' "$file"
  
  rm -f "$file.bak"
done

echo "Done!"
