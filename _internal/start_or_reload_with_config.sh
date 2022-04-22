#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

if [ $# -eq 0 ]
  then
    echo "Error: Please provide a path to an NGINX config file"
    exit 1
  else
    CONFIG_PATH=$1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"


# Make sure nginx is stopped but don't show any output to the user
"${PROJECT_ROOT}"/_internal/bin/nginx -c $CONFIG_PATH -s stop > /dev/null  || true

# Remove the unix domain socket used to run integration tests since nginx does not clean it up
# on stop
rm -f /tmp/njs_test_runner.sock

"${PROJECT_ROOT}"/_internal/bin/nginx -c $CONFIG_PATH

