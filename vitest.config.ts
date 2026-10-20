import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const p = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@party/game-engine': p('./packages/game-engine/src/index.ts'),
      '@party/game-registry': p('./packages/game-registry/src/index.ts'),
      '@party/protocol/types': p('./packages/protocol/src/types.ts'),
      '@party/protocol': p('./packages/protocol/src/index.ts'),
      '@party/impostor-engine': p('./packages/impostor-engine/src/index.ts'),
      '@party/uno-engine': p('./packages/uno-engine/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    environment: 'node',
  },
});
