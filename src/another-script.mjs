/**
 * Shows an example of a function that could be passed to `js_header_filter`
 * directive to remove certain headers from the response
 * @param r HTTP request
 */
function stripAmazonHeaders(r) {
  for (var key in r.headersOut) {
    if (key.match(/^x\-amz\-/i)) {
      delete r.headersOut[key];
    }
  }
}

export default { stripAmazonHeaders };
