#!/usr/bin/env node

// Simple test script to verify the keep-alive setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Falix Keep-Alive Bot setup...\n');

// Check required environment variables
const requiredEnvVars = ['FALIX_EMAIL', 'FALIX_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nThese should be set as GitHub Secrets in your repository.');
} else {
  console.log('✅ All required environment variables are set');
}

// Check optional environment variables with defaults
const optionalEnvVars = {
  'FALIX_BASE_URL': 'https://client.falixnodes.net',
  'FALIX_SERVER_HOST': 'mikeqd.falixsrv.me', 
  'CHECK_INTERVAL_MS': '120000',
  'AD_WATCH_MS': '35000',
  'HEADLESS': 'true'
};

console.log('\nOptional environment variables:');
Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
  const value = process.env[varName] || defaultValue;
  console.log(`✅ ${varName}: ${value}`);
});

// Check package.json dependencies
console.log('\nChecking package.json dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'p-retry'];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  if (missingDeps.length > 0) {
    console.log('❌ Missing dependencies:');
    missingDeps.forEach(dep => console.log(`   - ${dep}`));
  } else {
    console.log('✅ All required dependencies are present');
  }
  
  if (packageJson.scripts?.keepalive) {
    console.log('✅ npm script "keepalive" is defined');
  } else {
    console.log('❌ npm script "keepalive" is missing');
  }
} catch (error) {
  console.log('❌ Failed to read package.json:', error.message);
}

// Check if main script exists
console.log('\nChecking main script...');
const scriptPath = path.join(__dirname, 'falix-keepalive.js');
if (fs.existsSync(scriptPath)) {
  console.log('✅ Main script exists: scripts/falix-keepalive.js');
} else {
  console.log('❌ Main script missing: scripts/falix-keepalive.js');
}

// Check workflow file
console.log('\nChecking GitHub workflow...');
const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'falix-keepalive.yml');
if (fs.existsSync(workflowPath)) {
  console.log('✅ GitHub workflow exists: .github/workflows/falix-keepalive.yml');
} else {
  console.log('❌ GitHub workflow missing: .github/workflows/falix-keepalive.yml');
}

console.log('\nSetup test completed!');
console.log('\nNext steps:');
console.log('1. Set FALIX_EMAIL and FALIX_PASSWORD as GitHub Secrets');
console.log('2. Run "npm install" to install dependencies');
console.log('3. Trigger the workflow manually or wait for scheduled run');