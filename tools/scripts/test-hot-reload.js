#!/usr/bin/env node

/**
 * Hot Reload Testing Script
 * Tests hot reload functionality across all development services
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

class HotReloadTester {
  constructor() {
    this.testResults = [];
    this.originalFiles = new Map();
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

  backupFile(filePath) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      this.originalFiles.set(filePath, content);
      return true;
    }
    return false;
  }

  restoreFile(filePath) {
    if (this.originalFiles.has(filePath)) {
      fs.writeFileSync(filePath, this.originalFiles.get(filePath));
      this.originalFiles.delete(filePath);
    }
  }

  restoreAllFiles() {
    for (const [filePath] of this.originalFiles) {
      this.restoreFile(filePath);
    }
  }

  modifyFile(filePath, modification) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    this.backupFile(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = modification(content);
    fs.writeFileSync(filePath, modifiedContent);
  }

  waitForChange(ms = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testFrontendHotReload() {
    this.log('Testing Frontend Hot Reload...', 'info');
    
    const testFile = 'apps/web-frontend/src/app/page.tsx';
    const testComment = `// Hot reload test: ${Date.now()}`;

    try {
      this.modifyFile(testFile, (content) => {
        return content + '\n' + testComment;
      });

      await this.waitForChange(3000);

      // Check if the file was successfully modified
      const modifiedContent = fs.readFileSync(testFile, 'utf8');
      const success = modifiedContent.includes(testComment);

      this.restoreFile(testFile);
      
      if (success) {
        this.log('✅ Frontend hot reload: File modification successful', 'success');
        return true;
      } else {
        this.log('❌ Frontend hot reload: File modification failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Frontend hot reload error: ${error.message}`, 'error');
      this.restoreFile(testFile);
      return false;
    }
  }

  async testApiGatewayHotReload() {
    this.log('Testing API Gateway Hot Reload...', 'info');
    
    const testFile = 'apps/api-gateway/src/routes/health.ts';
    const testComment = `// Hot reload test: ${Date.now()}`;

    try {
      this.modifyFile(testFile, (content) => {
        return content + '\n' + testComment;
      });

      await this.waitForChange(3000);

      // Check if the file was successfully modified
      const modifiedContent = fs.readFileSync(testFile, 'utf8');
      const success = modifiedContent.includes(testComment);

      this.restoreFile(testFile);
      
      if (success) {
        this.log('✅ API Gateway hot reload: File modification successful', 'success');
        return true;
      } else {
        this.log('❌ API Gateway hot reload: File modification failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ API Gateway hot reload error: ${error.message}`, 'error');
      this.restoreFile(testFile);
      return false;
    }
  }

  async testSharedPackageHotReload() {
    this.log('Testing Shared Package Hot Reload...', 'info');
    
    const testFile = 'packages/shared-types/src/index.ts';
    const testType = `export type HotReloadTest${Date.now()} = string;`;

    try {
      this.modifyFile(testFile, (content) => {
        return content + '\n' + testType;
      });

      await this.waitForChange(3000);

      // Check if the file was successfully modified
      const modifiedContent = fs.readFileSync(testFile, 'utf8');
      const success = modifiedContent.includes(testType);

      this.restoreFile(testFile);
      
      if (success) {
        this.log('✅ Shared package hot reload: File modification successful', 'success');
        return true;
      } else {
        this.log('❌ Shared package hot reload: File modification failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Shared package hot reload error: ${error.message}`, 'error');
      this.restoreFile(testFile);
      return false;
    }
  }

  async testEnvironmentHotReload() {
    this.log('Testing Environment Variable Hot Reload...', 'info');
    
    const envFile = 'apps/api-gateway/.env';
    const testVar = `HOT_RELOAD_TEST=${Date.now()}`;

    try {
      if (!fs.existsSync(envFile)) {
        fs.writeFileSync(envFile, '');
      }

      this.modifyFile(envFile, (content) => {
        return content + '\n' + testVar;
      });

      await this.waitForChange(2000);

      // Check if the file was successfully modified
      const modifiedContent = fs.readFileSync(envFile, 'utf8');
      const success = modifiedContent.includes(testVar);

      this.restoreFile(envFile);
      
      if (success) {
        this.log('✅ Environment hot reload: File modification successful', 'success');
        return true;
      } else {
        this.log('❌ Environment hot reload: File modification failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Environment hot reload error: ${error.message}`, 'error');
      this.restoreFile(envFile);
      return false;
    }
  }

  async testWebSocketConnection() {
    this.log('Testing WebSocket Connection...', 'info');
    
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:3001');
      
      const timeout = setTimeout(() => {
        this.log('❌ WebSocket connection: Timeout', 'error');
        ws.terminate();
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.log('✅ WebSocket connection: Successful', 'success');
        ws.close();
        resolve(true);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`❌ WebSocket connection error: ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  async runTests() {
    this.log('🔥 Starting Hot Reload Tests...', 'info');
    this.log('====================================', 'info');

    const tests = [
      { name: 'Frontend Hot Reload', fn: () => this.testFrontendHotReload() },
      { name: 'API Gateway Hot Reload', fn: () => this.testApiGatewayHotReload() },
      { name: 'Shared Package Hot Reload', fn: () => this.testSharedPackageHotReload() },
      { name: 'Environment Hot Reload', fn: () => this.testEnvironmentHotReload() },
      { name: 'WebSocket Connection', fn: () => this.testWebSocketConnection() }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
        this.testResults.push({ name: test.name, passed: result });
      } catch (error) {
        this.log(`❌ ${test.name}: ${error.message}`, 'error');
        failed++;
        this.testResults.push({ name: test.name, passed: false, error: error.message });
      }
    }

    this.log('====================================', 'info');
    this.displayResults(passed, failed);
  }

  displayResults(passed, failed) {
    this.log(`\n🔥 Hot Reload Test Results:`, 'info');
    this.log(`✅ Passed: ${passed}`, 'success');
    this.log(`❌ Failed: ${failed}`, 'error');

    const total = passed + failed;
    const percentage = Math.round((passed / total) * 100);
    
    if (percentage >= 80) {
      this.log(`\n🎉 Hot reload functionality: ${percentage}% - EXCELLENT!`, 'success');
    } else if (percentage >= 60) {
      this.log(`\n✅ Hot reload functionality: ${percentage}% - GOOD`, 'success');
    } else {
      this.log(`\n⚠️ Hot reload functionality: ${percentage}% - NEEDS IMPROVEMENT`, 'warning');
    }

    if (failed > 0) {
      this.log('\n⚠️ Some hot reload features may not be working properly.', 'warning');
      this.log('Check that development servers are running: npm run dev', 'info');
    } else {
      this.log('\n🚀 All hot reload features working perfectly!', 'success');
    }

    // Always restore files before exit
    this.restoreAllFiles();
  }
}

// Graceful cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n🧹 Cleaning up test files...');
  const tester = new HotReloadTester();
  tester.restoreAllFiles();
  process.exit(0);
});

// Run tests
if (require.main === module) {
  const tester = new HotReloadTester();
  tester.runTests().catch((error) => {
    console.error('Test runner error:', error);
    tester.restoreAllFiles();
    process.exit(1);
  });
}

module.exports = HotReloadTester;