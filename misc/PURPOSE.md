# What is the `/misc` folder?

Any files placed in the `/misc` folder will be built into your release.
The entire folder structure will be copied into the the release artifact with
files in the root of `/misc` being moved to the the location specified in `releases.<release_name>.releaseRoot` in
your `package.json`.

## What should I put in the `/misc` folder

### Management scripts
This folder is meant to contain files that are necessary for the management of your NGINX process.  For examples,
see https://www.nginx.com/resources/wiki/start/topics/examples/initscripts/

It may not be necessary to include anything here if you don't have special management needs.

### Static files
You may also include static files in this folder to be served. The folder structure will be the same in your release,
so files in `./misc/var/www` will be added to the release bundle in `./var/www`.