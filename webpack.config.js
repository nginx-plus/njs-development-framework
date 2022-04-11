const path = require("path");

module.exports = {
  cache: false,
  entry: "./src/script.js",
  mode: "production", // Using production mode since it forces webpack to not use `eval` which is not supported by njs
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "_build"),
  },
  optimization: {
    minimize: false, // No need to minimize since we are not shipping to the browser
  },
  module: {
    rules: [
      {
        test: /\.m?js$$/,
        exclude: [/\bcore-js\b/, /\bwebpack\/buildin\b/, /(bower_components)/],
        use: {
          loader: 'babel-loader',
          options: {
            sourceType: "unambiguous"
          }
        }
      }
    ],
  },
};
