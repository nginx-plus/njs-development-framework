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

import Test from './test.mjs';
import * as http from 'http';

// We commit this transpiled version of power assert since njs does not have `assert`
// and we want to avoid transpiling the actual test code.
import assert from './power-assert.mjs';

function request(options) {
  const finalOptions = Object.assign(
    {
      socketPath: '/tmp/njs_test_runner.sock',
      path: '/', // Path can be overridden in test
    },
    options
  );

  return new Promise((resolve, reject) => {
    const callback = (res) => {
      const buffer = [];

      res.setEncoding('utf8');
      res.on('data', (chunk) => buffer.push(chunk));
      res.on('error', reject);
      res.on('end', () => {
        const body = buffer.join('');
        resolve([body, res]);
      });
    }

    const clientRequest = http.request(finalOptions, callback);
    clientRequest.end();
  });
}

// Initialize the test suite.  Importing a test file and
// invoking it with this instance and `assert` will
// mutate this instance to add those tests to its
// queue to run.
const suite = Test('NJS App Tests');

//====================
// ADD YOUR TESTS HERE
//====================
// Import tests.  For now this has to be done manually
import basicTest from '../integration/basic.test.mjs';

// Add tests to suite
basicTest(suite, assert, request);

suite.run().then((result) => {
  if (result.fail.length === 0) {
    console.log('🐳 Tests finished: No failures! 🐳');
  } else {
    console.log(`❌ Tests finished with ${result.fail.length} failure(s) ❌`)
    process.exitCode = 1
  }
});
