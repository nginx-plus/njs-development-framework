import isEqual from '../support/lodash.is-equal.mjs';
export default function (test, assert, request) {
  test(
    'unixTest: Hello',
    new Promise((done, error) => {
      request({ path: '/' })
        .then((response) => {
          assert(response[1].statusCode === 200);
          assert(isEqual(response[0], 'Hello World'));
          done();
        })
        .catch(error);
    })
  );
}
