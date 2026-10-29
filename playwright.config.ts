import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  timeout:30000,
  fullyParallel:false,
  workers:1,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:8789',trace:'off'},
  webServer:{command:'node scripts/run-e2e.mjs',url:'http://127.0.0.1:8789',reuseExistingServer:false,timeout:300000},
});
