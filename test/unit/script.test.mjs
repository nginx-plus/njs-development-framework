import helper from '../support/njs-test-helper.mjs';
import isEqual from '../support/lodash.is-equal.mjs';
import subject from '../../_build/js_bundles/script.mjs';
export default function (test, assert) {
  const ResponseMock = helper.ResponseMock;

  test(
    'plaintextResponseExample: invokes the return with the expected response',
    new Promise((done) => {
      const njsR = new ResponseMock();
      subject.plaintextResponseExample(njsR);
      // TODO: how can we do this flexibly without requiring two checks?
      assert(njsR.invocationsOf('return').length === 1);
      assert(
        isEqual(njsR.invocationsOf('return')[0], [
          200,
          'Hello World',
        ])
      );
      done();
    })
  );

  test('variableComputationExample: with English', function () {
    const njsR = new ResponseMock()
      .addHeader('Accept-Language', 'en')
      .addHeader('Content-Type', 'text/plain');

    assert(subject.variableComputationExample(njsR) === 'Hello my friend');
  });

  test('variableComputationExample: with Korean', function () {
    const njsR = new ResponseMock()
      .addHeader('Accept-Language', 'ko')
      .addHeader('Content-Type', 'text/plain');

    assert(subject.variableComputationExample(njsR) === '안녕하세요?');
  });

  test('variableComputationExample: with unexpected language header', function () {
    const njsR = new ResponseMock()
      .addHeader('Accept-Language', 'lat')
      .addHeader('Content-Type', 'text/plain');

    assert(subject.variableComputationExample(njsR) === 'Bark Bark');
  });

  test('variableComputationExample: with no language header', function () {
    const njsR = new ResponseMock().addHeader('Content-Type', 'text/plain');

    assert(njsR.headersIn['Accept-Language'] == undefined);
    assert(subject.variableComputationExample(njsR) === 'Bark Bark');
  });
}
