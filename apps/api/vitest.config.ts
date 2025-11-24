import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: [
      // Package aliases
      { find: /^@cloudmake\/types/, replacement: path.resolve(__dirname, '../../packages/types/src') },
      { find: /^@cloudmake\/utils/, replacement: path.resolve(__dirname, '../../packages/utils/src') },
      { find: /^@cloudmake\/api-client/, replacement: path.resolve(__dirname, '../../packages/api-client/src') },
      { find: /^@cloudmake\/ui/, replacement: path.resolve(__dirname, '../../packages/ui/src') },
      { find: /^@flaresmith\/types/, replacement: path.resolve(__dirname, '../../packages/types/src') },
      { find: /^@flaresmith\/utils/, replacement: path.resolve(__dirname, '../../packages/utils/src') },
      { find: /^@flaresmith\/api-client/, replacement: path.resolve(__dirname, '../../packages/api-client/src') },
      { find: /^@flaresmith\/ui/, replacement: path.resolve(__dirname, '../../packages/ui/src') },
      // Local db aliases - catch all schema subpaths
      { find: /^\.\.\/\.\.\/db\/schema\/(.+)$/, replacement: path.resolve(__dirname, './db/schema/$1.ts') },
      { find: /^\.\.\/\.\.\/db\/schema$/, replacement: path.resolve(__dirname, './db/schema/index.ts') },
      { find: /^\.\.\/\.\.\/db\/client$/, replacement: path.resolve(__dirname, './src/db/client.ts') },
      { find: /^\.\.\/\.\.\/db\/connection$/, replacement: path.resolve(__dirname, './db/connection.ts') },
      { find: /^\.\.\/\.\.\/\.\.\/db\/connection$/, replacement: path.resolve(__dirname, './db/connection.ts') },
    ],
  },
});
