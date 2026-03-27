#!/bin/bash

# Replace KeyContext with clean version
cat > /home/dan/Documents/go/src/userless/threads/components/KeyContext/KeyContext.tsx << 'EOF'
"use client";

export {
  KeyContextProvider,
  usePrivateKeys,
  useAddPrivateKey,
  useMasterKey,
} from "ui-components";
EOF

# Replace PostThread with clean version  
cat > /home/dan/Documents/go/src/userless/threads/components/PostThread/PostThread.tsx << 'EOF'
"use client";

export { PostThread, PostThreadNarrow } from "ui-components";
export type { PostThreadProps } from "ui-components";
EOF

echo "Files replaced successfully"