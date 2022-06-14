#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o pipefail # don't hide errors within pipes

./_internal/build.mjs test "$@"
njs ./test/support/runner-unit.mjs
