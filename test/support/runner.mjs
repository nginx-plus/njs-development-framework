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
import fs from "fs";


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

// Currently we don't have insight into the final details of
// the test due to the async nature of the tests and njs'
// buggy behavior with async/await
suite.run().then((result) => {
  console.log("🐳 Tests finished! 🐳");
});
