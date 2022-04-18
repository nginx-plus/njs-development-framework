const path = require("path");

module.exports = {
  // Every key in this object will output a new bundled and transpiled script
  // into the `_build` directory
  entry: {
    script: "./src/script.mjs",
    "another-script": "./src/another-script.mjs",
  },

  // Using production mode since it forces webpack to not use `eval`
  //which is not supported by njs
  mode: "production",

  experiments: {

    // This setting is required to support ES6 module syntax generation
    outputModule: true
  },


  output: {

    // The `filename` patter here will apply to each key in the `entry` key
    // specified above.  `[name]` is the interpolation syntax so given a
    // key of `my-script` the default config below will produce a file called
    // `my-script.mjs` in the `./_build` directory
    filename: "[name].mjs",
    path: path.resolve(__dirname, "_build"),

    library: {
      // Tells Webpack to produce an ES6 module
      type: 'module'
    }
  },

  optimization: {
    // No need to minimize since we are not shipping to the browser
    minimize: false,
  },

  module: {
    rules: [
      // Pulls in babel-present-env for transpilation and will transpile
      // all `.js` or `.mjs` files given to webpack.  Functionally this means
      // any file in `entry` and any dependencies that called with `require`
      // or `import`
      {
        test: /\.m?js$$/,
        // Make sure we're not transpiling our polyfill library. This is important
        // since we want to be sure that only polyfills for functionally not
        // natively supported by NJS are included.

        // To understand the transpilation and polyfill settings, see the
        // `babel.config.json` file in the root of the project.
        exclude: [/\bcore-js\b/, /\bwebpack\/buildin\b/, /(bower_components)/],
        use: {
          loader: "babel-loader",
          options: {
            // Per the Webpack documentation:
            // 'Consider the file a "module" if import/export statements are
            // present, or else consider it a "script".''
            sourceType: "unambiguous",
          },
        },
      },
    ],
  },
  // Webpack no longer polyfills node things by default. This link shows the old polyfills
  // https://webpack.js.org/configuration/resolve/#resolvefallback
  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"], // other stuff
    fallback: {
      // path: require.resolve("path-browserify"),
      // stream: require.resolve('stream-browserify'),
      // buffer: require.resolve('buffer'),
      // process: require.resolve('process'),
    },
  },
};
