import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { include: ['tests/js/**/*.test.js'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(process.cwd()) } },
});
