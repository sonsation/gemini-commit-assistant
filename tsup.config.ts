import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  clean: true,
  minify: false,
  sourcemap: false,
});
