> :warning: **This repo is not ready for serious use**: Currently exploring patterns and options and may change out from under you!

# Create NJS App

Create, build, and test [NJS](https://nginx.org/en/docs/njs/) addons for NGINX.

## Goals/Roadmap
- [x] Transpile most code with packages from NPM to javascript that can run on the NJS interpreter
- [ ] Find a less hacky way to handle default exports (maybe a webpack plugin)
- [x] Provide a testing example and run commands
- [ ] Support typescript transparantly
- [ ] Provide a guide to choosing transpilation vs handrolled njs code
  - [ ] Provide a guide to writing performant and secure njs code
  - [ ] Enumerate differences from other popular interpreters

- [ ] Think about an app generation pattern (see `create-react-app`) or maybe something like old `yeoman` (look at https://github.com/jondot/hygen)
- [ ] Think about a cleaner pattern for scripts and maintaining an njs binary
- [x] Think about incorporating and actual nginx server in the test/dev loop
- [ ] Package a release
  - [ ] Optional versioning
  - [ ] CI build example
  - [ ] Allow to choose between building one module or a whole config
  - [ ] Allow inclusion of arbitrary files in package
  - [ ] Allow free choice in file structure

## Getting Started
1. Clone the repository:
`git clone git@github.com:4141done/create-njs-app.git`

2. Install dependendecies.
Create NJS App requires node 14+.  It comes with `.tool-versions` and `.nvmrc` files so you can use [asdf](https://github.com/asdf-vm/asdf) or [nvm](https://github.com/nvm-sh/nvm) to make sure you have a good version.
```
# If using asdf
asdf install

# If using nvm
nvm use

# Install dependencies
npm install

```

3. Setting up NJS
This will install the NJS commandline tool for you. Currently we assume that you have a compatible version of [pcre2](https://github.com/PhilipHazel/pcre2/releases)
and [OpenSSL](https://www.openssl.org/source/) installed on your system.  Later versions of this README will provide guides to installing these tools
from source or build the installation into the setup script.

The below script may take a while to run:

```
./setup.sh
```
<details>
  <summary>Using Docker</summary>
  If you prefer not to install dependencies from source, you can use docker.
  You may build the included Dockerfile with the following command:
  `docker build -t my-nginx -f _internal/Dockerfile .`

  After that you can run various tasks like running unit tests:
  `docker run -v $(pwd):/create-njs-app --rm my-nginx /bin/bash -l -c 'npm run test:unit'`

  Integration tests:
  `docker run -v $(pwd):/create-njs-app --rm my-nginx /bin/bash -l -c 'npm run test:integration -- --nginx-bin-path=nginx --nginx-module-path=/usr/lib/nginx/modules`

  Build a release:
  `docker run -v $(pwd):/create-njs-app --rm my-nginx /bin/bash -l -c 'npm run release'`

  Alternately, you can leverage `docker-compose`. If you know how to use docker compose all the usual commands will work.  They have also been aliased as `npm run docker:up` and `npm run docker:down`

  Once the docker image is running you can run any of the other actions:

  Unit tests:
  `docker-compose exec dev /bin/bash -l -c 'npm run test:unit'`

  Integration tests:
  `docker-compose exec dev /bin/bash -l -c 'npm run test:integration -- --nginx-bin-path=nginx --nginx-module-path=/usr/lib/nginx/modules'`

  Build a release:
  `docker-compose exec dev /bin/bash -l -c 'npm run test:unit'`
</details>



## Usage
The following example shows you how to write some njs code, import a dependency, and build it.

### Writing your code
Your code will be written in the `./src/scripts`.  Filenames MUST have a `.mjs` extension.
<details>
  <summary>What is a `.mjs` file?</summary>
  
  `.mjs` is a file extension that tells nodejs that the file is an [EcmaScript Module](https://nodejs.org/api/esm.html).
  Basically it means that it provides one or more [`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) statements and can be [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)ed as shared code.

  NJS only has support for EcmaScript Module's `export default` syntax and NOT commonJS (`require`) to load shared 
  code so for areas of code that are not transpiled we use this throughout the project.
</details>

The `./src/scripts/script.mjs` file contains example code that already works, so let's just modify it in a small way.  Maybe we want to build a little endpoint that returns the version of our njs code:
```javascript
...
function plaintextResponseExample(r) {
  // See https://nginx.org/en/docs/njs/reference.html for the javascript API reference
  // ..your code.
  r.return(200, 'Hello 🌎');
}

...
```

### Trying out your code
```bash
$ npm run build

$ curl http://localhost:8082
Hello 🌎
```

### Running Tests
We can use our test suite to validate output. Try running the integration tests:
```bash
$ npm run test:integration

NJS App Tests 
✗ unixTest: Hello | AssertionError [ERR_ASSERTION]: false == true
🐳 Tests finished! 🐳
```
It failed! but that's expected since we changed the return value of the endpoint.

Let's see if the unit tests also fail:
```bash
$ npm run test:unit

NJS App Tests 
✔ variableComputationExample: with English
✔ variableComputationExample: with Korean
✔ variableComputationExample: with unexpected language header
✔ variableComputationExample: with no language header
✔ stripAmazonHeaders: with no amazon headers
✔ stripAmazonHeaders: with amazon headers
✗ plaintextResponseExample: invokes the return with the expected response | AssertionError [ERR_ASSERTION]: false == true
🐳 Tests finished! 🐳
```

We have two failures. Let's fix them.

### Fixing Tests
Lets open up `./test/integration/basic.test.mjs` and modify it like so:
```javascript
...
test(
  'unixTest: Hello',
  new Promise((done, error) => {
    request({ path: '/' })
      .then((response) => {
        assert(response[1].statusCode === 200);
        assert(isEqual(response[0], 'Hello 🌎'));
        done();
      })
      .catch(error);
  })
);
...
```

Now running `npm run test:integration` shows a pass:

```bash
NJS App Tests 
✔ unixTest: Hello
🐳 Tests finished! 🐳
```

Can you fix the unit tests too?

### Adding a dependency
> :warning: TODO: find a better example

Say we want our version number response to include a request id, but specifically we want it to be a type generated by `nanoid`.
First, from the command line: `npm install --save nanoid`

```javascript
...
import { nanoid } from 'nanoid/non-secure';

function plaintextResponseExample(r) {
  // See https://nginx.org/en/docs/njs/reference.html for the javascript API reference
  // ..your code.
  r.headersOut['X-Request-ID'] = nanoid();
  r.return(200, 'Hello 🌎');
}

...
```

### Building
`npm run build` will build your JS and config and make it available on a local NGINX server at `http://localhost:8082`

### Releasing
`npm run release` run from the commandline will produce a folder structure in `./_build/release`

#### Configuring your release

The release configuration is located in the `package.json` file at the project root and looks like this:

```
"releases": {
    "my_release": {
      "version": "0.0.1",
      "releaseRoot": "./",
      "nginxPrefix": "/usr/local/nginx",
      "nginxModulesPath": "./modules"
    }
  }
```

Using the above snippet as a reference configuration has the following effects:

* `my_release`: This can be any string.  This is the name of your release and will be included in the filename of the release artifact

* `version`: This is an arbitrary version string that will be included in the filename of the release artifact.

* `releaseRoot`: Sets the folder structure inside the archive produced by the release process.  Mainly helpful if you know that you need to extract the archive from a certain location on the target host and would like to overwrite the existing configuration.

* `nginxPrefix`: The NGINX prefix as specified in the `./configure` command flag `--prefix`.  In most cases, you can find the prefix on your target machine by running `nginx -V` on that machine.

* `nginxModulesPath`: Where NGINX is configured to look for modules, relative to the `nginxPrefix` config option. In most cases, you can find the module path on your target machine by running `nginx -V` on that machine.

## Command Reference
| Command                    | description                                                             |
|----------------------------|-------------------------------------------------------------------------|
| `npm run build`            | Builds the project and makes it available at `http://localhost:8082`    |
| `npm run release`          | Builds the project and creates a folder structure in `./_build/release` |
| `npm run test:unit`        | Runs the unit tests                                                     |
| `npm run test:integration` | Runs the integration tests                                              |
| `npm run clean`            | Removes all files and folders from the `_build` directory               |
