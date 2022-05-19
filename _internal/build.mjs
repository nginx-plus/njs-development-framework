#!/usr/bin/env node

// Node standard library modules
import * as path from 'path';
import { promisify } from 'util';
import {
  execFile as execFileCallback,
  exec as execCallback,
} from 'child_process';
const execFile = promisify(execFileCallback);
const exec = promisify(execCallback);

// Console formatting
import chalk from 'chalk';

// Argument parsing
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { open, promises as fs } from 'fs';

// Templating
import Handlebars from 'handlebars';

// The below is necessary because `__filename`
// and `__dirname` are not available in .mjs context
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DISALLOWED_FILES = ['.DS_Store', 'Thumbs.db', 'PURPOSE.md', '.gitkeep'];
const IGNORED_RELEASE_NAME = 'njsBuildIgnore';


const DEFAULT_ENV = 'dev';

// #=====================================
// # Parse Arguments and set environment
// #=====================================

const argv = yargs(hideBin(process.argv)).argv;
const nonFlagArgs = argv._;
const envArg = nonFlagArgs && nonFlagArgs.length ? nonFlagArgs[0].toLowerCase() : DEFAULT_ENV;
console.log(`argv ${JSON.stringify(argv)}`);

const prefixOverride = argv.nginxPrefix || null;
const nginxModulesPathOverride = argv.nginxModulePath || null;
const nginxBinPathOverride = argv.nginxBinPath || null;

const ENVS = {
  dev: {
    steps: [
      'clean',
      'copyNginxConfig',
      'copyMisc',
      'copyScripts',
      'reloadConfig',
    ],
    config: async () => {
      return {
        [IGNORED_RELEASE_NAME]: {
          nginxBinPath: nginxBinPathOverride || path.join(rootDir, '_internal', 'bin', 'nginx'),
          buildName: 'build:dev',
          releaseRoot: './',
          nginxPrefix: prefixOverride || path.join(rootDir, '_internal', 'install', 'nginx'),
          nginxModulesPath: nginxModulesPathOverride || path.join('_internal', 'install', 'nginx', 'modules'),
        },
      };
    },
  },
  test: {
    steps: [
      'clean',
      'copyNginxConfig',
      'copyMisc',
      'copyScripts',
      'reloadConfig',
    ],
    config: async () => {
      return {
        [IGNORED_RELEASE_NAME]: {
          nginxBinPath: nginxBinPathOverride || path.join(rootDir, '_internal', 'bin', 'nginx'),
          buildName: 'build:test',
          releaseRoot: './',
          nginxPrefix: prefixOverride || path.join(rootDir, '_internal', 'install', 'nginx'),
          nginxModulesPath: nginxModulesPathOverride || path.join('_internal', 'install', 'nginx', 'modules'),
        },
      };
    },
  },
  release: {
    steps: ['clean', 'copyNginxConfig', 'copyMisc', 'copyScripts', 'package'],
    config: async () => {
      const {
        default: { releases },
      } = await import(`${rootDir}/package.json`, { assert: { type: 'json' } });

      return releases;
    },
  },
};

if (!envArg || !ENVS[envArg]) {
  console.log(
    chalk.red(
      `Unknown build env: '${nonFlagArgs[0]}'\nPlease specify one of \`dev\`, \`test\`, or \`release\``
    )
  );

  process.exit(1);
}

const BUILD_STEPS = {
  clean: cleanBuildDir,
  copyNginxConfig: async (config) => {
    await Promise.all([
      copyNginxConfigFiles(config),
      copyEnvSpecificFiles(config),
    ]);
  },
  copyMisc: moveMiscFilesToTargetDir,
  copyScripts: bundleAndCopyScripts,
  reloadConfig: reloadNginxWithBuiltConfig,
  package: packageRelease,
};

// #===========================
// # Build process starts here
// #===========================
runBuild(envArg);

// #==============
// # Build Runner
// #==============
async function runBuild(env) {
  const releaseConfigs = await ENVS[env].config();

  const buildBasePath = `${rootDir}/_build/${env}`;
  const config = {
    env,
    steps: ENVS[env].steps,
    buildBasePath,
    nginxConfigSrcPath: `${rootDir}/src/conf`,
    envSpecificFilesSrcPath: `${rootDir}/env`,
    jsBundlesSrcPath: `${rootDir}/_build/js_bundles`,
  };



  for (const [name, releaseSpecificConfig] of Object.entries(releaseConfigs)) {
    const releaseBasePath = path.join(
      buildBasePath,
      // HACK: for dev and test, don't build the release name's folder
      name === IGNORED_RELEASE_NAME ? '' : name,
      // Version is not required
      releaseSpecificConfig.version || ''
    );

    const releaseBuildBasePath = path.join(
      releaseBasePath,
      releaseSpecificConfig.releaseRoot
    );

    const releaseConfig = Object.assign(config, releaseSpecificConfig, {
      buildName: releaseSpecificConfig.buildName || `release:${releaseIdentifier(
        name,
        releaseSpecificConfig.version
      )}`,
      releaseName: name,
      buildBasePath: releaseBuildBasePath,
      jsBundlesDestPath: path.join(releaseBuildBasePath, 'scripts')
    });
    console.log(releaseConfig);
    await runPipeline(releaseConfig);
  }
}

async function runPipeline(config) {
  const timerId = chalk.green(`Finished ${config.buildName} in`);
  console.time(timerId);
  for (let step of config.steps) await BUILD_STEPS[step](config);
  console.timeEnd(timerId);
}

// #==============
// # Build Steps
// #==============
async function packageRelease({ buildBasePath, releaseName, version, env }) {
  // This is an absolute path leading to `_build/${env}`
  const envBuildDirPath = path.resolve(buildBasePath, path.join(rootDir, '_build', env));

  const archiveFilename = `${releaseIdentifier(releaseName, version)}.tar.gz`;
  const archivePath = path.join(
    envBuildDirPath,
    archiveFilename
  );

  await exec(
    `tar -C ${buildBasePath} -czf ${archivePath} .`
  );

  console.log(chalk.green(`Release built to ${archivePath}`));

  await fs.rm(path.join(envBuildDirPath, releaseName), { recursive: true, force: true });
}

async function reloadNginxWithBuiltConfig({ buildBasePath,  nginxBinPath }) {
  await execFile(path.join(__dirname, 'start_or_reload_with_config.sh'), [
    nginxBinPath,
    path.join(buildBasePath, 'nginx.conf'),
  ]);
}

async function cleanBuildDir({ buildBasePath, jsBundlesSrcPath }) {
  await fs.rm(buildBasePath, { recursive: true, force: true });
  await fs.rm(jsBundlesSrcPath, { recursive: true, force: true });
  await fs.mkdir(buildBasePath, { recursive: true });
}

async function copyNginxConfigFiles({ buildBasePath, nginxConfigSrcPath }) {
  await forFilesInDirectory(nginxConfigSrcPath, async (filePath, directory) => {
    const operationName = 'Nginx Config';
    if (filePath) {
      await copyFileRelativeToBase(
        buildBasePath,
        nginxConfigSrcPath,
        filePath,
        operationName
      );
    } else if (directory) {
      await createDirRelativeToBase(
        buildBasePath,
        nginxConfigSrcPath,
        directory,
        operationName
      );
    }
  });
}

async function copyEnvSpecificFiles({
  env,
  buildBasePath,
  envSpecificFilesSrcPath,
  nginxPrefix,
  nginxModulesPath
}) {
  const configFilePatternForEnv = new RegExp(`\.${env}\.`, 'gi');
  await forFilesInDirectory(
    envSpecificFilesSrcPath,
    async (filePath, directory) => {
      const operationName = 'Env Specific Files';
      if (filePath) {
        const filename = path.basename(filePath);
        if (!configFilePatternForEnv.test(filename)) return;

        const newFilePath = await copyFileRelativeToBase(
          buildBasePath,
          envSpecificFilesSrcPath,
          filePath,
          operationName,
          (filename) => filename.replace(configFilePatternForEnv, '.')
        );

        const fileContent = await fs.readFile(newFilePath, 'utf8');
        const template = Handlebars.compile(fileContent);

        const moduelPathRelativeToPrefix = path.relative(nginxPrefix, nginxModulesPath);
        const nginxModulesPathAbsolute = path.resolve(nginxPrefix, moduelPathRelativeToPrefix);
        await fs.writeFile(newFilePath, template({ nginxModulesPathAbsolute }));

      } else if (directory) {
        await createDirRelativeToBase(
          buildBasePath,
          envSpecificFilesSrcPath,
          directory
        );
      }
    }
  );
}

async function bundleAndCopyScripts({ jsBundlesDestPath, jsBundlesSrcPath }) {
  await fs.mkdir(jsBundlesDestPath, { recursive: true });
  await execFile(`${__dirname}/bundle_with_transpile.sh`, []);
  await forFilesInDirectory(jsBundlesSrcPath, async (filePath) => {
    const pattern = /\.m?js$/gi;
    if (filePath && pattern.test(filePath)) {
      const operationName = 'JS Bundles';
      await copyFileRelativeToBase(
        jsBundlesDestPath,
        jsBundlesSrcPath,
        filePath,
        operationName
      );
    }
  });
}

// #==============================================================
// # Helper functions
// #==============================================================
async function forFilesInDirectory(baseDirectoryPath, callback) {
  const files = [];
  const filenames = await fs.readdir(baseDirectoryPath);

  let paths = filenames.map((filename) => `${baseDirectoryPath}/${filename}`);

  for (let path of paths) {
    const fileInfo = await fs.stat(path);

    if (fileInfo.isFile()) {
      await callback(path, null);
    } else if (fileInfo.isDirectory()) {
      await callback(null, path);
      forFilesInDirectory(path, callback);
    }
  }

  return paths;
}

async function moveMiscFilesToTargetDir({ buildBasePath }) {
  const operationName = 'Copy /misc';
  const relPath = path.join(rootDir, 'misc');

  await forFilesInDirectory(relPath, async (filePath, directory) => {
    if (filePath) {
      await copyFileRelativeToBase(
        buildBasePath,
        relPath,
        filePath,
        operationName
      );
    } else if (directory) {
      await createDirRelativeToBase(
        buildBasePath,
        relPath,
        directory,
        operationName
      );
    }
  });
}

async function copyFileRelativeToBase(
  basePath,
  srcPath,
  filePath,
  operationName = 'Build',
  filenameTransformFn
) {
  let destPath = path.join(basePath, path.relative(srcPath, filePath));

  const filename = path.basename(filePath);
  if (DISALLOWED_FILES.includes(filename)) return;

  if (filenameTransformFn) {
    const pathWithoutFilename = destPath.replace(filename, '');

    const newFilename = filenameTransformFn(filename);
    destPath = path.join(pathWithoutFilename, newFilename);
  }

  console.log(`[${operationName}] Copy file: ${filePath} to ${destPath}`);
  await fs.copyFile(filePath, destPath);
  return destPath;
}

async function createDirRelativeToBase(
  basePath,
  srcPath,
  directoryPath,
  operationName = 'Build'
) {
  console.log(
    `[${operationName}] Ensure directory exists: ${path.join(
      basePath,
      path.relative(srcPath, directoryPath)
    )}`
  );
  await fs.mkdir(path.join(basePath, path.relative(srcPath, directoryPath)), {
    recursive: true,
  });
}

function releaseIdentifier(name, version) {
  return `${name}-${version}`;
}
