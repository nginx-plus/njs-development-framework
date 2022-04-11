// Example script, all of this may be removed or changed.

function myFunction(r) {
  // See https://nginx.org/en/docs/njs/reference.html for the javascript API reference
  // ..your code.
  r.return(200, 'Hello, world');
}

// NJS only supports `export default`.  Therefore anything you want to call
// from the NGINX context needs to be exported here in the object.
// It is also possible to just import a single function.
export default { myFunction };