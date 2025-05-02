// startup-log.js
console.log('Starting PSG Queue Handler...');
console.log('Node version:', process.version);
console.log('Environment variables:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
});

// Check if Chrome is available
import { execSync } from 'child_process';
try {
  const chromeVersion = execSync('google-chrome --version').toString().trim();
  console.log('Chrome version:', chromeVersion);
} catch (err) {
  console.error('Chrome check failed:', err.message);
}

// Continue with regular server startup
import('./server.js');