import { defineConfig } from 'vite';
export default defineConfig({root:'apps/web',publicDir:'../../packages/tile-packs/public',build:{outDir:'../../dist/web',emptyOutDir:true},server:{host:'0.0.0.0'}});
