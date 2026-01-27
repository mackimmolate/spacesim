import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
import { defineConfig } from "vite";

export default defineConfig({
  base: "/spacesim/",
});
