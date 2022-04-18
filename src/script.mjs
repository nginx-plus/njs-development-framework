// Example script, all of this may be removed or changed.


// This function provides an example where the final action invokes
// an NJS library function to complete.  In this case, `return`.
// https://nginx.org/en/docs/njs/reference.html#r_return
// It would likely be used with a `js_content` directive;
// https://nginx.org/en/docs/http/ngx_http_js_module.html#js_content
function plaintextResponseExample(r) {
  // See https://nginx.org/en/docs/njs/reference.html for the javascript API reference
  // ..your code.
  r.return(200, 'Hello, world');
}


// This function provides an example where a value in the request
// (in this case, a header) is read and a simple value is returned
// this may be useful when using the `js_set` directive
function variableComputationExample(r) {
   switch (r.headersIn['Accept-Language']) {
    case 'en':
      return 'Hello my friend';
      break;

    case 'ko':
      return '안녕하세요?';
      break;

    default:
      // If no language preference given, assume the client is likely a dog
      return 'Bark Bark';
   }
}

// NJS only supports `export default`.  Therefore anything you want to call
// from the NGINX context needs to be exported here in the object.
// It is also possible to just import a single function.
export default { plaintextResponseExample, variableComputationExample };
