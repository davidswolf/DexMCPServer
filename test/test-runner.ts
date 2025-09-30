/**
 * Simple test runner for integration tests
 *
 * Usage: node --loader tsx test/test-runner.ts
 */

import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test framework
type TestFn = () => Promise<void> | void;
type BeforeEachFn = () => Promise<void> | void;

interface TestSuite {
  description: string;
  tests: Array<{ description: string; fn: TestFn; only?: boolean }>;
  beforeEach?: BeforeEachFn;
  suites: TestSuite[];
}

let currentSuite: TestSuite = {
  description: 'root',
  tests: [],
  suites: []
};

const suiteStack: TestSuite[] = [currentSuite];

global.describe = (description: string, fn: () => void) => {
  const suite: TestSuite = {
    description,
    tests: [],
    suites: []
  };

  currentSuite.suites.push(suite);
  suiteStack.push(suite);
  currentSuite = suite;

  fn();

  suiteStack.pop();
  currentSuite = suiteStack[suiteStack.length - 1];
};

global.it = (description: string, fn: TestFn) => {
  currentSuite.tests.push({ description, fn });
};

global.beforeEach = (fn: BeforeEachFn) => {
  currentSuite.beforeEach = fn;
};

// Test statistics
let passed = 0;
let failed = 0;
const failures: Array<{ suite: string; test: string; error: Error }> = [];

// Run a single test suite
async function runSuite(suite: TestSuite, prefix = '', parentBeforeEach?: BeforeEachFn): Promise<void> {
  const suiteName = prefix ? `${prefix} > ${suite.description}` : suite.description;

  // Combine parent and current beforeEach
  const beforeEach = suite.beforeEach || parentBeforeEach;

  // Run tests in this suite
  for (const test of suite.tests) {
    try {
      if (beforeEach) {
        await beforeEach();
      }

      await test.fn();

      passed++;
      console.log(`  ✓ ${suiteName} > ${test.description}`);
    } catch (error) {
      failed++;
      failures.push({
        suite: suiteName,
        test: test.description,
        error: error as Error
      });
      console.log(`  ✗ ${suiteName} > ${test.description}`);
    }
  }

  // Run nested suites, passing down the beforeEach
  for (const nested of suite.suites) {
    await runSuite(nested, suiteName, beforeEach);
  }
}

// Main test runner
async function runTests() {
  console.log('Running integration tests...\n');

  const testFiles = (await readdir(__dirname))
    .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'));

  for (const file of testFiles) {
    console.log(`\n${file}:`);

    // Reset suite stack
    currentSuite = {
      description: file,
      tests: [],
      suites: []
    };
    suiteStack.length = 0;
    suiteStack.push(currentSuite);

    // Import test file (use file:// URL for Windows compatibility)
    const testPath = join(__dirname, file);
    const fileUrl = new URL(`file:///${testPath.replace(/\\/g, '/')}`);
    await import(fileUrl.href);

    // Run tests
    await runSuite(currentSuite);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`\nTest Results:`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);

  // Print failures
  if (failures.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('\nFailures:\n');

    for (const failure of failures) {
      console.log(`${failure.suite} > ${failure.test}`);
      console.log(`  ${failure.error.message}`);
      if (failure.error.stack) {
        console.log(`  ${failure.error.stack.split('\n').slice(1, 4).join('\n  ')}`);
      }
      console.log('');
    }
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Type declarations
declare global {
  function describe(description: string, fn: () => void): void;
  function it(description: string, fn: TestFn): void;
  function beforeEach(fn: BeforeEachFn): void;
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});