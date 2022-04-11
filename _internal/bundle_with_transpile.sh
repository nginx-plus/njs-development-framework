#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

OUTFILE='_build/bundle.js'
WEBPACK_CONFIG='webpack.config.js'
TARGET='directive'

while getopts ":t:" opt; do
  case $opt in
    t)
      case $OPTARG in
        cli)
          echo "Building for NJS CLI target"
          TARGET=cli
        ;;
        directive)
          echo "Building for directive target"
          TARGET=directive
        ;;
        *)
          echo "Uknown build target.  Valid options are 'cli' or 'directive'"
          exit 1
        ;;
      esac
    ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
    ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      exit 1
    ;;
  esac
done

# Build with transpile.  This produces an IIFE that assigns
# any default exports to a js variable called `__WEBPACK_DEFAULT_EXPORT__`
npx webpack -c $WEBPACK_CONFIG


# NJS cli does not know what to do with the `export default` expression
# However, it's necessary for code brought in with `js_import`
if [ $TARGET = 'directive' ]
then
  # If a default export was found, replace the variable assignment with
  # an assignement to a predefined key on the `global` object used by NJS
  sed -i -e 's/var __WEBPACK_DEFAULT_EXPORT__/global.bundleExports/g' $OUTFILE

  # If we did have a default export, add a line to the very end of the file
  # that exports the item on the global object in a way njs will understand.
  # njs supports the ES6 `export` keyword but only with `default`.
  # This is why we cannot at the moment configure webpack to
  # output `export default` in the same way njs understands it.
  # If njs could be updated to support `export { foo as default };`
  # Then this final step would be unnecessary
  if grep -Fq "global.bundleExports" $OUTFILE
  then
    echo "Found default export, writing default export for NJS"
    echo "" >> $OUTFILE # Add a newline
    echo 'export default global.bundleExports;' >> $OUTFILE
  else
    echo "No default export"
  fi
fi

