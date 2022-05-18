/**
 * This is the file to invoke to run the tests.
 * Currently test files must be included manually.
 * Output is currently just to the console, but the end goal is to
 * have junit or some other common reporting format be produced by
 * default so that these tests can play well with CI.
 * For examples of testing see
 * https://volument.com/baretest#getting-started
 * @module test/support/runner
 */

import Test from "./test.mjs";

// We commit this transpiled version of power assert since njs does not have `assert`
// and we want to avoid transpiling the actual test code.
import assert from './power-assert.mjs';

// Initialize the test suite.  Importing a test file and
// invoking it with this instance and `assert` will
// mutate this instance to add those tests to its
// queue to run.
const suite = Test("NJS App Tests");

//====================
// ADD YOUR TESTS HERE
//====================
// Import tests.  For now this has to be done manually
import scriptTest from '../unit/script.test.mjs';
import anotherScriptTest from '../unit/another-script.test.mjs';

// Add tests to suite
scriptTest(suite, assert);
anotherScriptTest(suite, assert);

suite.run().then((result) => {
  if (result.fail.length === 0) {
    console.log('🐳 Tests finished! 🐳');
  } else {
    console.log(`❌ Tests finished with ${result.fail.length} failure(s) ❌`);

    // This is necessary since njs does not support `process.exit`
    // It will lead to a slightly strange message "Error: unhandled promise rejection:"
    // But it's the best we can do without `process.exit`
    throw 'Exit 1';
  }
});
