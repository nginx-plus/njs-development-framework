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
import { promises as fs } from 'fs';

// The below is necessary because `__filename`
// and `__dirname` are not available in .mjs context
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DISALLOWED_FILES = ['.DS_Store', 'Thumbs.db', 'PURPOSE.md'];

const ENVS = {
  dev: ['clean', 'copyNginxConfig', 'copyMisc', 'copyScripts', 'reloadConfig'],
  test: ['clean', 'copyNginxConfig', 'copyMisc', 'copyScripts', 'reloadConfig'],
  release: ['clean', 'copyNginxConfig', 'copyMisc', 'copyScripts', 'package'],
};

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

const DEFAULT_ENV = 'dev';

// #=====================================
// # Parse Arguments and set environment
// #=====================================

const argv = yargs(hideBin(process.argv)).argv._;
const envArg = argv && argv.length ? argv[0].toLowerCase() : DEFAULT_ENV;

if (!envArg || !ENVS[envArg]) {
  console.log(
    chalk.red(
      `Unknown build env: '${argv[0]}'\nPlease specify one of \`dev\`, \`test\`, or \`release\``
    )
  );

  process.exit(1);
}

// #===========================
// # Build process starts here
// #===========================
runBuild(envArg);

// #==============
// # Build Runner
// #==============
async function runBuild(env) {
  const buildBasePath = `${rootDir}/_build/${env}`;
  const config = {
    env,
    steps: ENVS[env],
    buildBasePath,
    nginxConfigSrcPath: `${rootDir}/src/conf`,
    envSpecificFilesSrcPath: `${rootDir}/env`,
    jsBundlesSrcPath: `${rootDir}/_build/js_bundles`,
    jsBundlesDestPath: `${buildBasePath}/scripts`,
  };

  if (env === 'release') {
    const {
      default: { releases },
    } = await import(`${rootDir}/package.json`, { assert: { type: 'json' } });
    const builds = [];

    for (const [name, releaseSpecificConfig] of Object.entries(releases)) {
      const archiveBasePath = path.join(
          buildBasePath,
          name,
          releaseSpecificConfig.version
        );

      const releaseBuildBasePath = path.join(
        archiveBasePath,
        releaseSpecificConfig.nginxRoot
      );

      const releaseConfig = Object.assign(config, releaseSpecificConfig, {
        buildName: `Release:${releaseIdentifier(
          name,
          releaseSpecificConfig.version
        )}`,
        releaseName: name,
        archiveBasePath,
        buildBasePath: releaseBuildBasePath,
        jsBundlesDestPath: path.join(releaseBuildBasePath, 'scripts'),
      });

      await runPipeline(releaseConfig);
    }

  } else {
    await runPipeline(Object.assign(config, { buildName: `Build:${env}` }));
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
async function packageRelease({ archiveBasePath, releaseName, version }) {
  const archiveFilename = `${releaseIdentifier(releaseName, version)}.tar.gz`;
  const archivePath = path.join(archiveBasePath, archiveFilename);

  // Create the archive
  // The file must be created first since it exists at the base
  // and must be ignored.
  await fs.open(archivePath, 'w');
  await exec(
    `tar -C ${archiveBasePath} -czf ${archivePath} --exclude ${archiveFilename} .`
  );

  console.log(chalk.green(`Release built to ${archivePath}`));
}

async function reloadNginxWithBuiltConfig({ buildBasePath }) {
  await execFile(path.join(__dirname, 'start_or_reload_with_config.sh'), [
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
}) {
  const configFilePatternForEnv = new RegExp(`\.${env}\.`, 'gi');
  await forFilesInDirectory(
    envSpecificFilesSrcPath,
    async (filePath, directory) => {
      const operationName = 'Env Specific Files';
      if (filePath) {
        const filename = path.basename(filePath);
        if (!configFilePatternForEnv.test(filename)) return;

        await copyFileRelativeToBase(
          buildBasePath,
          envSpecificFilesSrcPath,
          filePath,
          operationName,
          (filename) => filename.replace(configFilePatternForEnv, '.')
        );
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
