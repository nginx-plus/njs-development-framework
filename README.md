> :warning: **This repo is not ready for serious use**: Currently exploring patterns and options and may change out from under you!

# Create NJS App

Create, build, and test [NJS](https://nginx.org/en/docs/njs/) addons for NGINX.

## Goals/Roadmap
* Transpile most code with packages from NPM to javascript that can run on the NJS interpreter
* Find a less hacky way to handle default exports (maybe a webpack plugin)
* Provide transpilation targets for both nsj cli tool and usage via various directives in [ngx_http_js_module](https://nginx.org/en/docs/http/ngx_http_js_module.html) and [ngx_stream_js_module](https://nginx.org/en/docs/stream/ngx_stream_js_module.html)
* Provide a testing example and run commands
* Support typescript transparantly
* Provide a guide to choosing transpilation vs handrolled njs code
  * Provide a guide to writing performant and secure njs code
  * Enumerate differences from other popular interpreters

* Think about an app generation pattern (see `create-react-app`) or maybe something like old `yeoman`
* Think about a cleaner pattern for scripts and maintaining an njs binary
* Think about incorporating and actual nginx server in the test/dev loop
* Provide and example of a workflow using the webpack dev server

## Where I left off

---

## Getting Started
1. For now, just clone the repository:
`git clone git@github.com:4141done/create-njs-app.git`

2. Install dependendecies.  Create NJS App assumes you have node 14+.  It comes with a `.tool-versions` and `.nvmrc` so to make sure you have a good node version you can just `asdf install` from the root directory

```
# If using asdf
asdf install

# If using nvm
nvm install

# Install dependencies
npm install

```

3. Setting up NJS
This will install the NJS commandline tool for you. Currently we assume that you have a compatible version of [pcre2](https://github.com/PhilipHazel/pcre2/releases)
and [OpenSSL](https://www.openssl.org/source/) installed on your system.  Later versions of this README will provide guides to installing these tools
from source or build the installation into the setup script

```
./setup.sh
```

## Building
You can build the script to two targets:
### Directive (default)
Running `npm run build` will produce a bundle targeted at the `js_import` directive. If you want to be explicit, you can call `npm run build -- -t directive`.

### CLI
`npm run build -- -t cli` will build the bundle without an `export default` statement.  This is useful for testing raw js code to see if it will run using the `njs` commandline tool


## Using the commandline
Make sure you've run `./setup.sh` before trying to use the command line tool.
`npm run njs` will get you into a repl where you can try out commands.

`npm run njs <path_to_file` will execute a file in the njs interpreter.

# TODO: how to load a file into the interpreter and play with it.
