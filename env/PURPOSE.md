# What
This folder contains nginx config which may be environment specific.
These files must be named in the format `name.<ENV_TAG>.conf` where
`ENV_TAG` is one of `dev`, `test`, or `release`.

They will be built into the release under `_build` as the filename
without the env tag.  So `listen.release.conf` will be included as `listen.conf`.

Thus, they may be referenced in your nginx configuration as above.