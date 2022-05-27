# Configuration
Configuration can be specified in two ways:
1. **Configuration in `package.json`**:  This is good for values that are known at build time and that are not secrets
2. **Environment Variables**: This strategy is best for secret values, or those that cannot be known at build time.  See the section on Environment Variables below for guidance on using them in your project.  There is no functionality provided specifically by the framework to enable this.

## Configuration in `package.json`
There are two types of configuration in `package.json`:

1. Release configuration: This is specific to a certain release artifact.  You may specify more than one release.  This is helpful if you want to ship the same configuration to nginx targets that may have different base nginx config such as the prefix or modules path.
2. Framework configuration: This configures default values for all releases as well as for the build and test environments of the framework.

### Release configuration
Release configuration looks like this:
```
  "devDependencies": {
      #...
  },
  "releases": {
    "my_release": {
      "version": "0.0.1",
      "releaseRoot": "./",
      "nginxPrefix": "/usr/local/nginx",
      "nginxModulesPath": "./modules",
      "config": {
        "s3_bucket_name": "my-bucket",
        "s3_server": "s3-us-east-1.amazonaws.com",
        "s3_server_proto": "https",
        "s3_server_port": 443,
        "aws_sigs_version": 4,
        "proxy_cache_valid_ok": "1h",
        "proxy_cache_valid_notfound": "1m",
        "proxy_cache_valid_forbidden": "30s"
      }
    }
  },
```
The under the parent key `releases` you can specify any number of release names (in the example above, `my_release`).
There are a few basic fields:
* `version`: A version string for the release. There are no formatting requirements.  At this point it's for your own reference.
* `releaseRoot`: This will be the base folder from which the release tarball will have folder structure.
* `nginxPrefix`: This should be the value of `prefix` if you run `nginx -V` on your target host.  The value should be an absolute path.
* `nginxModulesPath`: This should be the value of `modules-path` if you run `nginx -V` on your target host.  The value can be absolute or relative.  If it is relative, it will be relative to the `nginxPrefix`.

Beyond this, the `config` key may contain arbitrary key-value pairs that will be made available for templating configuration.  You can add a templated value to any file by:
1. Giving it a `.template` extension.
2. Treating the configuration file like a handlebars template.  For example

```
upstream storage_urls {
    server {{s3_server}}:{{s3_server_port}};
}
```

In you config, you may reference templated files without the `.template` extension as it will be stripped of the extension after templating has been completed.  For example, if you have a file at `./conf.d/my.conf.template`, you may include it as `include ./conf.d/my.conf`.

### Framework Configuration
These configuration options allow you to modify config that is relevant to the development or test environments, or to specify default values for all config (including releases).

The config for a specific environment will be used, but any keys not specified will get the default values.  Consider this configuration:

```
  "releases": {
    "my_release": {
      "version": "0.0.1",
      "releaseRoot": "./",
      "nginxPrefix": "/usr/local/nginx",
      "nginxModulesPath": "./modules",
      "config": {
        "s3_bucket_name": "release-bucket"
      }
    }
  },
  "configuration": {
    "dev": {},
    "test": {
      "config": {
        "s3_bucket_name": "test-bucket"
      }
    },
    "default": {
      "nginxPrefix": "./_internal/install/nginx",
      "nginxModulesPath": "./_internal/install/nginx/module",
      "config": {
        "s3_bucket_name": "my-bucket",
        "s3_server_proto": "https",
        "s3_server_port": 443,
      }
    }
  }
```

In the above configuration, the final config for the release would be:
```
 "my_release": {
      "version": "0.0.1",
      "releaseRoot": "./",
      "nginxPrefix": "/usr/local/nginx",
      "nginxModulesPath": "./modules",
      "config": {
        "s3_bucket_name": "release-bucket",
        "s3_server_proto": "https",
        "s3_server_port": 443
      }
    }
```
The release config did not specify keys present in the `default` config so they were supplied.  Those that were specified (`s3_bucket_name`), overwrite the default values.

Likewise, the `nginxPrefix` and `nginxModulesPath` were maintained to the release config.

For `test`, tests would be run with the following computed config:
```
"test": {
  "nginxPrefix": "./_internal/install/nginx",
  "nginxModulesPath": "./_internal/install/nginx/module",
  "config": {
    "s3_bucket_name": "test-bucket"
    "s3_server_proto": "https",
    "s3_server_port": 443,
  }
}
```
Note that the `s3_bucket_name` has been set to that specified for the test bucket, and the rest taken from `default`.

Finally, for `dev` no config was specified.  Thus, dev actions will be run with the following computed config:

```
"dev": {
  "nginxPrefix": "./_internal/install/nginx",
  "nginxModulesPath": "./_internal/install/nginx/module",
  "config": {
    "s3_bucket_name": "my-bucket",
    "s3_server_proto": "https",
    "s3_server_port": 443,
  }
}
```

Note that the `dev` key does **not** need to be specified if there is no config set.

### Accessing `config` Values from NJS Scripts:
The framework will generate a file at `./src/scripts/config.mjs` that exports an object containing all the config values for reference in your scripts.  You can access it in a script like so:

```javascript
import userConfig from './config.mjs';

userConfig.s3_bucket_name; // "my-bucket"
```

## Environment Variables
For configuration items that may be secret or that can only be known when the config is applied, it is recommended to use normal environment variables.  These
variables can be set as is normal for your platform, and accessed as follows:

### In NJS scripts
In scripts, the `process.env` object is accessible anywhere and will contain the values of all environment variables set.
```javascript
process.env['AWS_SECRET_KEY'];
```

### In NGINX config
#### Preserving variables with `env`
In NGINX config you may use the `env` directive:
```
env AWS_SECRET_KEY
```
Although this does not make the environment variables accessible directly in nginx, but rather preserves them for worker processes to access.

#### Interpolation with `envsubst`
If you need the values of your variables to be interpolated into your NGINX config before it is applied. In these cases, it is common practice to use the
`envsubst` tool.  A full description of this strategy is outside the scope of this document, but refer to [this answer](https://serverfault.com/a/755541) for one approach that takes into account common caveats.


## Environment-Specific templates
In the `envs` folder you may create files that will be included only in certain environments.  Like configuration, you may also provide a
base file that will be the fallback if there is no version of that file specified for that environment.

```
env/
├── log.conf
└── log.release.conf.template
```

In the above case, you may put something in your `nginx.conf` like: `include log.conf`.  The framework will include the contents of the `log.conf` file
in the `dev` and `test` environments.  For the `release` environment, a file called `log.conf` will be copied into the release containing the templated
content of `log.release.conf.template`.