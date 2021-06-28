const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV,

  entry: {
    'index': './src/index.jsx'
  },

  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js'
  },

  devtool: isDev ? 'source-map' : false,

  optimization: {
    minimize: false
  },

  resolve: {
    extensions: ['.js', '.jsx']
  },

  module: {
    rules: [
      {
        test: /\.js(x)?$/,
        loader: 'babel-loader'
      }
    ]
  },

  plugins: [
    isDev ? null : new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({ template: './src/index.html' })
  ].filter(p => p)
}