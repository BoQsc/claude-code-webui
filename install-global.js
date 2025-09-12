#!/usr/bin/env node

/**
 * Global installation script for Claude Code Web UI
 * This script handles building and installing the application globally
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command, cwd = process.cwd()) {
  log(`Running: ${command}`, 'cyan');
  try {
    execSync(command, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    log(`Error running: ${command}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 Claude Code Web UI Global Installation', 'blue');
  log('=' .repeat(50), 'blue');

  // Check if we're in the right directory
  const packageJsonPath = join(__dirname, 'backend', 'package.json');
  if (!existsSync(packageJsonPath)) {
    log('Error: This script must be run from the project root directory', 'red');
    process.exit(1);
  }

  // Step 1: Install backend dependencies
  log('\n📦 Installing backend dependencies...', 'yellow');
  if (!run('npm install', join(__dirname, 'backend'))) {
    log('Failed to install backend dependencies', 'red');
    process.exit(1);
  }

  // Step 2: Install frontend dependencies
  log('\n📦 Installing frontend dependencies...', 'yellow');
  if (!run('npm install', join(__dirname, 'frontend'))) {
    log('Failed to install frontend dependencies', 'red');
    process.exit(1);
  }

  // Step 3: Build frontend
  log('\n🔨 Building frontend...', 'yellow');
  if (!run('npm run build', join(__dirname, 'frontend'))) {
    log('Failed to build frontend', 'red');
    process.exit(1);
  }

  // Step 4: Build backend
  log('\n🔨 Building backend...', 'yellow');
  if (!run('npm run build', join(__dirname, 'backend'))) {
    log('Failed to build backend', 'red');
    process.exit(1);
  }

  // Step 5: Install globally using npm link
  log('\n🌍 Installing globally...', 'yellow');
  if (!run('npm link', join(__dirname, 'backend'))) {
    log('Failed to install globally. You may need to run with sudo/administrator privileges', 'red');
    process.exit(1);
  }

  log('\n✅ Installation complete!', 'green');
  log('\nYou can now run the application globally using:', 'green');
  log('  claude-code-webui', 'cyan');
  log('\nAvailable options:', 'green');
  log('  claude-code-webui --help     Show help', 'cyan');
  log('  claude-code-webui --port 9000 Use custom port', 'cyan');
  log('  claude-code-webui --debug     Enable debug logging', 'cyan');
  
  log('\nTo uninstall globally, run:', 'yellow');
  log('  npm unlink -g claude-code-webui', 'cyan');
}

main().catch(error => {
  log(`\n❌ Installation failed: ${error.message}`, 'red');
  process.exit(1);
});