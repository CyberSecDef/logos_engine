import { defineConfig } from 'vite';
export default defineConfig({
  root:'apps/web',
  publicDir:'../../packages/tile-packs/public',
  build:{
    outDir:'../../dist/web',emptyOutDir:true,
    rolldownOptions:{output:{codeSplitting:{groups:[
      // Stable renderer dependency can survive application-only deployments in browser cache.
      {name:'three',test:/node_modules[\\/]three[\\/]/},
    ]}}},
  },
  server:{host:'0.0.0.0'},
});
