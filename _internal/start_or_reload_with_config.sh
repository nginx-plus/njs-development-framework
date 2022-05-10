#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o pipefail # don't hide errors within pipes

if [ $# -eq 2 ]
  then
    nginx_command=$1
    CONFIG_PATH=$2
  else
    echo "Error: must pass the nginx executable path and conf path. Ex:\n start_or_reload_with_config.sh /usr/bin/nginx /etc/nginx/nginx.conf"
    exit 1
fi

echo "Reloading dev/test server with command: $@"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

if [ -n "$CNA_NGINX" ]; then
  nginx_command="${CNA_NGINX}"
fi

# Make sure nginx is stopped but don't show any output to the user
${nginx_command} -c $CONFIG_PATH -s stop > /dev/null  || true

# Remove the unix domain socket used to run integration tests since nginx does not clean it up
# on stop
rm -f /tmp/njs_test_runner.sock

${nginx_command} -c $CONFIG_PATH

