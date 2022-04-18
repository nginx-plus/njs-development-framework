/**
 * Test module based on https://github.com/volument/baretest
 * We are not using baretest because it is written in a way
 * that produces unpredictable results when run in njs.
 * However, the end goal is to either match the baretest API
 * with the addition of JUnit or some other standard reporting
 * or use baretest directly. Part of the motivation for
 * rewriting it directly here is that I don't want aggressive
 * transpilation of the core test code.  Hence the code is
 * generally written using syntax and structures that njs
 * supports natively.
 *
 * Currently this implementation does not support the
 * `before`, `after`, and `only` functionality of baretest,
 * nor does the CLI reporting match in format due to
 * the lack of `Process.stdin.write` in njs
 *
 * IT SHOULD NOT BE NECESSARY FOR YOU TO MODIFY THIS FILE
 * @module test/support/test
 */

function logError(msg) {
  console.log(`\x1b[31m✗ ${msg}\x1b[0m`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function runTestAsync(test) {
  const testPromise = new Promise((resolve, reject) => {
    if (typeof test.fn === "function") {
      try {
        const result = test.fn();
        logSuccess(test.name);
        return resolve({ name: test.name, result: result, success: true });
      } catch (e) {
        logError(`${test.name} | ${e}`);
        return resolve({ name: test.name, result: e, success: false });
      }
    } else {
      return test.fn
        .then((result) => {
          logSuccess(test.name);
          resolve({ result: result, name: test.name, success: true });
        })
        .catch((e) => {
          logError(`${test.name} | ${e}`);
          resolve({ name: test.name, result: e, success: false });
        });
    }
  });

  return Object.assign(testPromise, { name: test.name });
}

export default function Test(headline) {
  const suite = [];

  function self(name, fn) {
    suite.push({ name: name, fn: fn });
  }

  self.run = () => {
    console.log(headline + " ");
    const tests = suite.map((test) => runTestAsync(test));
    const firstTest = tests.splice(0, 1)[0];

    return tests.reduce((prev, current) => {
      return prev.then((result) => {
        return current;
      });
    }, firstTest);
  };

  return self;
}
