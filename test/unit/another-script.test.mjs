import helper from '../support/njs-test-helper.mjs';
import isEqual from '../support/lodash.is-equal.mjs';
import subject from '../../_build/another-script.mjs';

export default function (test, assert) {
  const ResponseMock = helper.ResponseMock;

  test('stripAmazonHeaders: with no amazon headers', function () {
    const njsR = new ResponseMock();

    const initialHeaders = {
      'Content-Type': 'application/json'
    };

    const expectedHeaders = {
      'Content-Type': 'application/json'
    };

    njsR.headersOut = initialHeaders;
    subject.stripAmazonHeaders(njsR);
    assert(isEqual(njsR.headersOut, expectedHeaders));
  });

  test('stripAmazonHeaders: with amazon headers', function () {
    const njsR = new ResponseMock();

    const initialHeaders = {
      'Content-Type': 'application/json',
      'X-Amz-Request-Id': 'B07YFBRP67'
    };

    const expectedHeaders = {
      'Content-Type': 'application/json'
    };

    // Assign and break reference
    njsR.headersOut = initialHeaders;
    subject.stripAmazonHeaders(njsR);

    assert(isEqual(njsR.headersOut, expectedHeaders));
  });
}
