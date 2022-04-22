#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

pushd _internal

./compile_njs.sh

cat << EOF
  You are now set up!  Here are some next steps you can try:

  * Run the integration tests with 'npm run test:integration'

  * Run the unit tests with 'npm run test:unit'

  * Make a test fail by modifying the code in './src/scripts'

  * Create a release with 'npm run release'
EOF