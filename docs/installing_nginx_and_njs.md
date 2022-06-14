# Installing nginx and njs
In this guide, we'll cover how to install from source. Currently it's necessary to do a little bit more
work from source since there are some patches we need to apply to the njs source code.

If you don't want to worry about this, the framework comes with a set of commands that will let you use
a prebuilt docker image to test and build your code.  See the main readme for usage instructions.

To proceed, you'll need to have `pcre2` installed on your system.  `pcre2` is very important for increased compatibility with Ecmascript regular expressions.

## Installing dependencies
If using MacOS, make sure you have the latest version of commandline tools installed.

First we'll download the sources for the two dependencies.  It's not necessary to install `openssl`, but
we will need to install `pcre2` before compiling njs.

`curl -O https://www.openssl.org/source/openssl-3.0.2.tar.gz`
`curl -L -O https://github.com/PhilipHazel/pcre2/releases/download/pcre2-10.40/pcre2-10.40.tar.gz`
`tar -xvf openssl-3.0.2.tar.gz`
`tar -xvf pcre2-10.40.tar.gz`

Before moving on, make sure you have `pcre2` installed since the njs installation will need to find it.  **pcre2 is specifically required.  pcre will not work**.
1. `cd pcre2-10.40`
1. `make`
1. `make install` (you may have to use `sudo` for this)

## Preparing njs
Currently we need to compile njs from source and apply a patch to handle some issues (fix in progress by the njs team). In the future, we may be able to use njs statically compiled into packaged versions of nginx.
Make sure you've installed `pcre2` before completing this step

1. `git clone git@github.com:nginx/njs.git`
1. `cd njs`
1. `git checkout tags/0.7.4` (latest version)
1. `git apply njs_src_fixes.patch`
1. `./configure --debug=YES`
1. `make`
1. `cp ./build/njs <SOME_PLACE_IN_YOUR_PATH>`

## Installing `nginx`
Note that the following assumes that we would like to install nginx's files and libraries at `$HOME/nginx` and place the `nginx` binary at `$HOME/bin/nginx` but you can make your own decisions about pathing.  As long as the `nginx` binary is in your `PATH` and executable without `sudo` things will work fine.
You can add whatever additional configuration you like, but you'll need to be sure the `--add-dynamic-module=../njs/nginx`
and `--with-pcre` and `--with-openssl` flags are set (`--with openssl` can be optional if you choose to disable ssl support).

1. Download nginx source: `curl --silent --location --remote-name http://nginx.org/download/nginx-1.21.6.tar.gz`
1. `tar -xvf nginx-1.21.6.tar.gz`
1. `cd nginx-1.21.6`
1. ```
./configure --add-dynamic-module=../njs/nginx \
            --with-debug \
            --prefix=$HOME/nginx \
            --sbin-path=$HOME/bin/nginx \
            --without-http_gzip_module \
            --with-openssl=../openssl-3.0.2 \
            --with-pcre=../pcre2-10.40 \
            --with-threads \
            --with-cc-opt='-g -O0 -fstack-protector-strong -Wformat -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2 -fPIC' \
            --with-compat
```
1. `make`
1. `make install`

This will be the nginx server that runs your integration tests and that serves your dev config, so it is important to try to make it match your target environment as much as possible.

## Checking accessibility and configuration `create-njs-app`
Use `which nginx` and `which njs` to check that they are both in your `PATH`. You are done!

## Addendum
### Using `njs` and `nginx` not in your `PATH`
If you don't want these to be in your `PATH`, take the paths that you installed the two executables to and add them to the framework config in `package.json`

By default, `create-njs-app` will use the `nginx` and `njs` executables in your `PATH`.  However, you may also specify the commands to use by setting the following in the `configuration` key in your `package.json`:
```
"configuration": {
  "dev": {
    "config": {}
  },
  "test": {
    "config": {
      "nginx_command": "/path/to/my/test/nginx",
      "njs_command": "/path/to/my/test/njs"
    }
  },
  "default": {
    "config": {
      "nginx_command": "/path/to/my/nginx",
      "njs_command": "/path/to/my/njs"
    }
  }
}
```

You can also supply these to the `test` command like this:
`npm run test:integration -- --nginx-bin-path=/path/to/my/test/nginx`
The paths specified can be either relative or absolute.  Paths to executables specified via the command line will override those in the `package.json`

