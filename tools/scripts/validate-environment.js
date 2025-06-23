#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates the complete development environment setup
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

class EnvironmentValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[34m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  test(name, fn) {
    try {
      this.log(`Testing: ${name}`, 'info');
      const result = fn();
      if (result) {
        this.log(`✅ ${name}`, 'success');
        this.results.passed++;
        this.results.tests.push({ name, status: 'passed' });
      } else {
        this.log(`❌ ${name}`, 'error');
        this.results.failed++;
        this.results.tests.push({ name, status: 'failed' });
      }
    } catch (error) {
      this.log(`❌ ${name}: ${error.message}`, 'error');
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  warning(name, message) {
    this.log(`⚠️ ${name}: ${message}`, 'warning');
    this.results.warnings++;
    this.results.tests.push({ name, status: 'warning', message });
  }

  checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    return major >= 18;
  }

  checkNpmVersion() {
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim();
      const major = parseInt(version.split('.')[0]);
      return major >= 9;
    } catch {
      return false;
    }
  }

  checkFileExists(filePath) {
    return fs.existsSync(path.resolve(filePath));
  }

  checkDirectoryStructure() {
    const requiredDirs = [
      'apps',
      'apps/api-gateway',
      'apps/web-frontend',
      'packages',
      'packages/shared-types',
      'packages/instruction-parser',
      'packages/zmq-protocol',
      '.github',
      '.github/workflows'
    ];

    return requiredDirs.every(dir => this.checkFileExists(dir));
  }

  checkPackageJson() {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredScripts = ['build', 'dev', 'lint', 'test', 'type-check'];
      return requiredScripts.every(script => pkg.scripts && pkg.scripts[script]);
    } catch {
      return false;
    }
  }

  checkDependencies() {
    try {
      execSync('npm ls --depth=0', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  checkTypeScript() {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  checkESLint() {
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  checkBuild() {
    try {
      execSync('npm run build', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  async checkServerHealth(port, timeout = 5000) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: timeout
      };

      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => resolve(false));
      req.end();
    });
  }

  checkEnvironmentFiles() {
    const requiredEnvFiles = [
      'apps/api-gateway/.env.example',
      'apps/web-frontend/.env.example'
    ];

    const hasExamples = requiredEnvFiles.every(file => this.checkFileExists(file));
    
    if (!hasExamples) {
      this.warning('Environment Files', 'Missing .env.example files');
    }

    return hasExamples;
  }

  checkDockerFiles() {
    const dockerFiles = [
      'apps/api-gateway/Dockerfile',
      'apps/web-frontend/Dockerfile'
    ];

    return dockerFiles.every(file => this.checkFileExists(file));
  }

  checkGitHooks() {
    return this.checkFileExists('.husky/_/husky.sh');
  }

  async runValidation() {
    this.log('🔍 Starting Environment Validation...', 'info');
    this.log('=====================================', 'info');

    // Prerequisites
    this.test('Node.js version >= 18', () => this.checkNodeVersion());
    this.test('npm version >= 9', () => this.checkNpmVersion());

    // Project Structure
    this.test('Directory structure', () => this.checkDirectoryStructure());
    this.test('package.json configuration', () => this.checkPackageJson());
    this.test('Dependencies installed', () => this.checkDependencies());

    // Code Quality
    this.test('TypeScript compilation', () => this.checkTypeScript());
    this.test('ESLint validation', () => this.checkESLint());
    this.test('Build process', () => this.checkBuild());

    // Configuration
    this.test('Environment files', () => this.checkEnvironmentFiles());
    this.test('Docker configuration', () => this.checkDockerFiles());
    this.test('Git hooks', () => this.checkGitHooks());

    // CI/CD
    this.test('GitHub Actions workflows', () => 
      this.checkFileExists('.github/workflows/ci.yml') &&
      this.checkFileExists('.github/dependabot.yml')
    );

    this.log('=====================================', 'info');
    this.displayResults();
  }

  displayResults() {
    this.log(`\n📊 Validation Results:`, 'info');
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, 'error');
    this.log(`⚠️ Warnings: ${this.results.warnings}`, 'warning');

    const total = this.results.passed + this.results.failed;
    const percentage = Math.round((this.results.passed / total) * 100);
    
    if (percentage >= 90) {
      this.log(`\n🎉 Environment validation: ${percentage}% - EXCELLENT!`, 'success');
    } else if (percentage >= 80) {
      this.log(`\n✅ Environment validation: ${percentage}% - GOOD`, 'success');
    } else if (percentage >= 70) {
      this.log(`\n⚠️ Environment validation: ${percentage}% - NEEDS IMPROVEMENT`, 'warning');
    } else {
      this.log(`\n❌ Environment validation: ${percentage}% - CRITICAL ISSUES`, 'error');
    }

    if (this.results.failed > 0) {
      this.log('\n🔧 Failed tests need attention before development can proceed.', 'error');
      process.exit(1);
    } else {
      this.log('\n🚀 Environment is ready for development!', 'success');
      process.exit(0);
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.runValidation().catch(console.error);
}

module.exports = EnvironmentValidator;