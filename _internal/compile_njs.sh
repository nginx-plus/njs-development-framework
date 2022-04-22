#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

#======================================
# 0. Check required commands
#======================================

if command -v wget >/dev/null; then
  download_cmd="wget --quiet --max-redirect=12 --output-document -"
elif command -v curl >/dev/null; then
  download_cmd="curl --silent --location --remote-name"
else
  echo >&2 "either wget or curl must be installed"
  exit 1
fi
if command -v sha256sum >/dev/null; then
  sha256sum_cmd="sha256sum --check"
elif command -v shasum >/dev/null; then
  sha256sum_cmd="shasum --algorithm 256 --check"
else
  echo >&2 "either sha256sum or shasum must be installed"
  exit 1
fi

verify_checksum() {
  CHECKSUM="$1"
  FILENAME="$2"

  echo "${CHECKSUM} *${FILENAME}" | ${sha256sum_cmd}
}

#======================================
# 1. Prepare directories and save paths
#======================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT_ABSOLUTE="$(dirname "${SCRIPT_DIR}")"
INTERNAL_DIR_ABSOLUTE="${PROJECT_ROOT_ABSOLUTE}/_internal"


cd "${INTERNAL_DIR_ABSOLUTE}"

INSTALL_DIR_ABSOLUTE="${INTERNAL_DIR_ABSOLUTE}/install"
SRC_DIR_ABSOLUTE="${INTERNAL_DIR_ABSOLUTE}/source"
TARBALL_DIR_ABSOLUTE="${INTERNAL_DIR_ABSOLUTE}/tar"

# Binaries don't do well when installed over one another
rm -rf "${INTERNAL_DIR_ABSOLUTE}/bin"

mkdir -p "${TARBALL_DIR_ABSOLUTE}"
mkdir -p "${SRC_DIR_ABSOLUTE}"
mkdir -p "${INSTALL_DIR_ABSOLUTE}"
mkdir -p "${INTERNAL_DIR_ABSOLUTE}/bin"

## TODO: Check for pcre2 and openssl in the default places before trying to install
## TODO: see how we can allow install of these tools with brew
## TODO: Make sure pcre is not hooked in the install since we explicitly need pcre2
## See if we can install a local nginx for testing or auto inject the njs module

#======================================
# 2. Download source packages
#======================================
cd "${TARBALL_DIR_ABSOLUTE}"

# PCRE2
PCRE2_VERSION="10.40"
PCRE2_CHECKSUM="ded42661cab30ada2e72ebff9e725e745b4b16ce831993635136f2ef86177724"
PCRE2_FILENAME="pcre2-${PCRE2_VERSION}.tar.gz"
[[ -e "${PCRE2_FILENAME}" ]] || ${download_cmd}  "https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE2_VERSION}/${PCRE2_FILENAME}"
verify_checksum "${PCRE2_CHECKSUM}" "${PCRE2_FILENAME}"

# OpenSSL
OPENSSL_VERSION="3.0.2"
OPENSSL_CHECKSUM="98e91ccead4d4756ae3c9cde5e09191a8e586d9f4d50838e7ec09d6411dfdb63"
OPENSSL_FILENAME="openssl-${OPENSSL_VERSION}.tar.gz"
[[ -e "${OPENSSL_FILENAME}" ]] || ${download_cmd} "https://www.openssl.org/source/${OPENSSL_FILENAME}"
verify_checksum "${OPENSSL_CHECKSUM}" "${OPENSSL_FILENAME}"

# NGINX

NGINX_VERSION="1.21.6"
NGINX_CHECKSUM="66dc7081488811e9f925719e34d1b4504c2801c81dee2920e5452a86b11405ae"
NGINX_FILENAME="nginx-${NGINX_VERSION}.tar.gz"
[[ -e "${NGINX_FILENAME}" ]] || ${download_cmd} "http://nginx.org/download/${NGINX_FILENAME}"
verify_checksum "${NGINX_CHECKSUM}" "${NGINX_FILENAME}"

cd "${SRC_DIR_ABSOLUTE}"

[[ -d njs ]] || git clone git@github.com:nginx/njs.git

#======================================
# 3. Uncompress all sources
#======================================
# Make sure only the files in the current archive exist in the target dir
rm -rf "${SRC_DIR_ABSOLUTE}/pcre2"
rm -rf "${SRC_DIR_ABSOLUTE}/openssl"
rm -rf "${SRC_DIR_ABSOLUTE}/nginx"

mkdir -p "${SRC_DIR_ABSOLUTE}/pcre2"
mkdir -p "${SRC_DIR_ABSOLUTE}/openssl"
mkdir -p "${SRC_DIR_ABSOLUTE}/nginx"

tar -xvf "${TARBALL_DIR_ABSOLUTE}/${PCRE2_FILENAME}" -C "${SRC_DIR_ABSOLUTE}/pcre2" --strip-components 1
tar -xvf "${TARBALL_DIR_ABSOLUTE}/${OPENSSL_FILENAME}" -C "${SRC_DIR_ABSOLUTE}/openssl" --strip-components 1
tar -xvf "${TARBALL_DIR_ABSOLUTE}/${NGINX_FILENAME}" -C "${SRC_DIR_ABSOLUTE}/nginx" --strip-components 1


#======================================
# 4. Install pcre2 (necessary for njs).
#    NGINX may use a different pcre if
#    that is preferred
#======================================
mkdir -p "${INSTALL_DIR_ABSOLUTE}/pcre2"
pushd pcre2
./configure --prefix="${INSTALL_DIR_ABSOLUTE}/pcre2"
make
make install

popd


#====================
# 5. Install openssl
#====================
mkdir -p "${INSTALL_DIR_ABSOLUTE}/openssl"
mkdir -p "${INSTALL_DIR_ABSOLUTE}/ssl"
pushd openssl
./Configure --prefix="${INSTALL_DIR_ABSOLUTE}/openssl" --openssldir="${INSTALL_DIR_ABSOLUTE}/ssl"
make
make install

popd

#======================================
# 6. Build NJS. Includes a hack which
#    applies a patch to the source.
#======================================
pushd njs


# This patch does two things:
# 1. Changes NJS' usage of pcre2 to set the PCRE2_EXTRA_ALLOW_SURROGATE_ESCAPES=true
#    option which allows it to process common JS regexes (since JS uses UTF-16 and)
#    certain regexes use surrogate codepoints which are not allowed by default
# 2. Removes placeholder funcitons on certain objects since they confuse polyfills.
#    If the if the function appears to be present, some polyfills will not apply
#    themselves which then triggers a runtime error "not implemented".
git apply --check ../../webpack_transpilation_fixes.patch && git apply ../../webpack_transpilation_fixes.patch
./configure --debug=YES # TODO: how to point this at local openssl and pcre2?
make

cp ./build/njs "${INTERNAL_DIR_ABSOLUTE}/bin"

popd

pushd nginx

#============================================
# 7. Build NGINX with NJS as a dynamic module
#============================================
# TODO: likely need to add nginx config passthrough in this script
./configure --add-dynamic-module=../njs/nginx \
            --with-debug \
            --without-http_gzip_module \
            --prefix="${PROJECT_ROOT_ABSOLUTE}" \
            --sbin-path="${INTERNAL_DIR_ABSOLUTE}/bin" \
            --modules-path="${INSTALL_DIR_ABSOLUTE}/nginx/modules" \
            --conf-path="${INSTALL_DIR_ABSOLUTE}/nginx/conf.d/nginx.conf" \
            --error-log-path="${INSTALL_DIR_ABSOLUTE}/nginx/log/error.log" \
            --http-log-path="${INSTALL_DIR_ABSOLUTE}/nginx/log/access.log" \
            --pid-path="${INSTALL_DIR_ABSOLUTE}/nginx/nginx.pid" \
            --lock-path="${INSTALL_DIR_ABSOLUTE}/nginx/nginx.lock" \
            --http-fastcgi-temp-path="${INSTALL_DIR_ABSOLUTE}/nginx/fastcgi_temp" \
            --http-uwsgi-temp-path="${INSTALL_DIR_ABSOLUTE}/nginx/uwsgi_temp" \
            --http-scgi-temp-path="${INSTALL_DIR_ABSOLUTE}/nginx/scgi_temp" \
            --http-proxy-temp-path="${INSTALL_DIR_ABSOLUTE}/nginx/proxy_temp" \
            --http-client-body-temp-path="${INSTALL_DIR_ABSOLUTE}/nginx/client_body_temp" \
            --with-openssl="${SRC_DIR_ABSOLUTE}/openssl" \
            --with-pcre="${SRC_DIR_ABSOLUTE}/pcre2" \
            --with-threads \
            --with-cc-opt='-g -O0 -fstack-protector-strong -Wformat -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2 -fPIC' \
            --with-compat

make

make install

# TODO: Look into running the nginx test suite here to confirm. (https://hg.nginx.org/nginx-tests/)
echo "Setup complete.  See package.json for available commands"
