#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

# TODO: We should be running the normal build with it set to module
# then running off the same build artifact you will release
TRANSPILED_FILES_DIR='./_build';
WEBPACK_CONFIG='webpack.config.js'

# Build with transpile.  This produces an IIFE that assigns
# any default exports to a js variable called `__WEBPACK_DEFAULT_EXPORT__`
npx webpack -c $WEBPACK_CONFIG

for i in $TRANSPILED_FILES_DIR/*.mjs; do
  # NJS cli does not know what to do with the `export default` expression
  # However, it's necessary for code brought in with `js_import`

  # If a default export was found, replace the variable assignment with
  # an assignement to a predefined key on the `global` object used by NJS
  # sed -i -e 's/.*harmony default export \*\/.*=/global.bundleExports =/g' $i
  sed -i -e 's/export { __webpack_exports__default as default };/export default __webpack_exports__default;/g' $i
done

exit 0


