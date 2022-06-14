/**
 * Serves as a repository for custom assertions and mock
 * objects to help with testing
 * @module test/support/njs-mock
 */

// TODO: Take in a full object here and apply it in all the right
// places
function ResponseMock() {
  //==========================
  // Mock Convenience Methods
  //==========================
  const self = this;
  self.invocations = {};

  self.invocationsOf = (fnName) => {
    return self.invocations[fnName] || [];
  };

  function initSpy(name) {
    self.invocations[name] = [];
    return function countInvocation() {
      self.invocations[name].push(argumentsToArray(arguments));
    };
  }

  //=================
  // Actual Mock API
  //=================
  // Spies for methods that are called and have a side effect
  self.return = initSpy('return');

  // Read only attributes
  self.headersIn = {};
  self.headersOut = {};
  self.variables = {};
  self.uri = '/';

  // Convenience methods for modifying read only elements
  self.addHeader = (key, value) => {
    self.headersIn[normalizeHeaderKey(key)] = value;
    return self;
  };

  // Meant to mimic an invocation of the `js_var` directive in the conf file.
  self.jsVar = (key, value) => {
    self.variables[key] = value;
    return self;
  };

  self.uri = (path) => {
    self.uri = path;
    return self;
  };
}

function normalizeHeaderKey(key) {
  // for now just return, but try to mimic the behavior
  // Think about how we can allow this without rewriting the whole
  // implementation (possible incorrectly) here.
  return key;
}

function argumentsToArray(args) {
  return Array.prototype.slice.call(args);
}

export default { ResponseMock };
