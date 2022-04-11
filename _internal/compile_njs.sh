#!/bin/bash

set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

## TODO: maybe rewrite this in JS for understandability to target audience
INTERNAL_DIR_ABSOLUTE="$PWD"
PCRE2_INSTALL_DIR_ABSOLUTE="$INTERNAL_DIR_ABSOLUTE/pcre2_install"
OPENSSL_INSTALL_DIR_ABSOLUTE="$INTERNAL_DIR_ABSOLUTE/openssl_install"
OPENSSL_DIR_ABSOLUTE="$INTERNAL_DIR_ABSOLUTE/openssl_dir"
NJS_CLONE_DIR_RELATIVE="njs_source"

## TODO: Check for pcre2 and openssl in the default places before trying to install
## TODO: see how we can allow install of these tools with brew
## TODO: Make sure pcre is not hooked in the install since we explicitly need pcre2
## See if we can install a local nginx for testing or auto inject the njs module

## INSTALL PCRE2
# rm -rf pcre2_install
# curl -L -O https://github.com/PhilipHazel/pcre2/releases/download/pcre2-10.39/pcre2-10.39.tar.gz

# tar -xvf pcre2-10.39.tar.gz
# rm pcre2-10.39.tar.gz


# mkdir $PCRE2_INSTALL_DIR_ABSOLUTE

# pushd pcre2-10.39

# ./configure --prefix="$PCRE2_INSTALL_DIR_ABSOLUTE"
# make
# make install

# popd

# rm -rf pcre2-10.39

## INSTALL OPENSSL3
# rm -rf OPENSSL_INSTALL_DIR_ABSOLUTE
# rm -rf OPENSSL_DIR_ABSOLUTE

# mkdir $OPENSSL_INSTALL_DIR_ABSOLUTE
# mkdir $OPENSSL_DIR_ABSOLUTE

# curl -L -O https://www.openssl.org/source/openssl-3.0.2.tar.gz
# tar -xvf openssl-3.0.2.tar.gz
# pushd openssl-3.0.2
# ./Configure --prefix="$OPENSSL_INSTALL_DIR_ABSOLUTE" --openssldir="$OPENSSL_DIR_ABSOLUTE"
# make
# make install
# popd
# rm -rf openssl-3.0.2


## Install NJS

rm -rf $NJS_CLONE_DIR_RELATIVE

git clone git@github.com:nginx/njs.git $NJS_CLONE_DIR_RELATIVE

pushd $NJS_CLONE_DIR_RELATIVE
git apply ../webpack_transpilation_fixes.patch

# TODO: This is not picking up the local PCRE2 and OPENSSL
# ./configure --debug=YES --cc-opt="-I $OPENSSL_INSTALL_DIR_ABSOLUTE/include/openssl -I $PCRE2_INSTALL_DIR_ABSOLUTE/include" --ld-opt="-L $OPENSSL_INSTALL_DIR_ABSOLUTE/lib -L $PCRE2_INSTALL_DIR_ABSOLUTE/lib"
./configure --debug=YES
make
# FOR NOW ASSUME THE USER HAS OPENSSL AND PCRE2 INSTALLED
popd

rm -rf $NJS_CLONE_DIR_RELATIVE

rm -f $INTERNAL_DIR_ABSOLUTE/njs
cp build/njs $INTERNAL_DIR_ABSOLUTE

# TODO: Provide an option to add the njs cli binary to your path
echo "NJS CLI tool setup complete!  You may run it with 'npm run njs'"

exit 0