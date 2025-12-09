#!/usr/bin/env node
import { build } from 'astro';

async function main() {
  try {
    console.log('Starting Astro build...');
    await build({
      root: process.cwd(),
      logLevel: 'info'
    });
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
