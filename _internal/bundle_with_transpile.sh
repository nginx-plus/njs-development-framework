#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

#=======================================
# 1. Figure out where the bundles go
#    and what webpack config to use.
#    Note that the TRANSPILED_FILES_DIR
#    needs to be the same as the one
#    in the webpack config 'output'
#    object.
#=======================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

TRANSPILED_FILES_DIR="${PROJECT_ROOT}"/_build/js_bundles
WEBPACK_CONFIG="webpack.config.js"

#==============================
# 2. Bundle and transpile files
#==============================
npx webpack -c "$WEBPACK_CONFIG"


#=========================================================
# 3. [HACK] Reformat Webpack exports for NJS compatibility
#=========================================================
for i in "${TRANSPILED_FILES_DIR}"/*.mjs; do
  # njs can't parse 'export { foo as default };` which is how webpack does modules.
  # So we have to do some hacky replacement to make the resulting bundle importable
  # in njs.

  # If a default export was found, export it using 'export default XX' syntax.
  sed -i -e 's/export { __webpack_exports__default as default };/export default __webpack_exports__default;/g' $i
done


