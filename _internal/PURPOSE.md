# Internal Folder
This folder will serve as the location for internal build artifacts
that are necessary for the operation of the dev workflow.

You generally should not have to pay attention to anything here
unless you need to recompile NJS, NGINX, or its dependences
for a special dev workflow.

This folder should not be checked in to git.

## File overview
`webpack_transpilation_fixes.patch`: A patch file containing the following fixes to the njs codebase:
* Adds the `PCRE2_EXTRA_ALLOW_SURROGATE_ESCAPES` flag to the `pcre2` config to account for the usage of surrogate code points in Javascript
* Removes several placeholder implementations so that polyfills and transpilation plugins can succesfully understand where they will need to apply