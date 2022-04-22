set -o errexit  # abort on nonzero exit status
set -o nounset  # abort on unbound variable
set -o pipefail # don't hide errors within pipes

#=============================
# 1. Normalize ENV_TAG
#=============================
if [ $# -eq 0 ]
  then
    ENV_TAG="dev"
  else
    case $1 in
      "test" | "TEST")
        ENV_TAG="test"
        ;;

      "release" | "RELEASE")
        ENV_TAG="release"
        ;;

      dev | "")
        ENV_TAG="dev"
        ;;

      *)
        echo "Unknown build env.  Please specify one of 'dev', 'test', or 'release'"
        exit 1
        ;;
    esac
fi

#=========================================
# 2. Set up paths for sources and targets
#=========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"

SRC_DIR="${PROJECT_ROOT}/src/conf"
SCRIPTS_SRC_DIR="${PROJECT_ROOT}"/_build/*.mjs
TARGET_DIR="${PROJECT_ROOT}/_build/${ENV_TAG}"
TARGET_SCRIPTS_DIR="${TARGET_DIR}/scripts"

#=================================================
# 3. Clean out any old build and set up new folder
#=================================================
rm -rf "${TARGET_DIR}"

mkdir -p "${TARGET_DIR}"

#============================================================================
# 4. Copy over all nginx conf files and import environment specific includes
#============================================================================

cp -r "${SRC_DIR}"/* "${TARGET_DIR}"

# Move in the correct listen header.
cp "config/listen.${ENV_TAG}.conf" "${TARGET_DIR}/listen.conf"


#=================================================
# 5. Build scripts and copy to expected directory
#=================================================
mkdir -p "${TARGET_SCRIPTS_DIR}"
./_internal/bundle_with_transpile.sh

cp ${SCRIPTS_SRC_DIR} "${TARGET_SCRIPTS_DIR}"


#=======================================================
# 6. Maybe reload the server if in 'dev' or 'test' envs
#=======================================================
# TODO: how to know which file?  If there are multiple for example?
# For now we can just require that there be only one root conf file?
# There are two scenarios we need to consider:
# 1. The user is using this framework to create a full config
# 2. The user is using this to produce an njs enabled "module" that they will be
#    adding to another config after we build out.
# Either way, for dev and test we need SOME kind of conf file to run the server with.
# Perhaps we just give them the ability to exclude the base conf file from the release
if [ "${ENV_TAG}" != "release" ]
  then
    echo "Reloading config on ${ENV_TAG} server..."
    ./_internal/start_or_reload_with_config.sh "${TARGET_DIR}/nginx.conf"
    echo "... done!"
  else
    echo "Release built to ${TARGET_DIR}"
fi
