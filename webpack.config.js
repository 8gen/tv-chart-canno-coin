const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require('webpack'); //to access built-in plugins

module.exports = {
    module: {
        rules: [{test: /\.txt$/, use: 'raw-loader'}],
    },
    output: {
        filename: '[name].[contenthash].bundle.js',
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                exclude: /charting_library/,
            }),
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "./charting_library",
                    to: "charting_library"
                },
            ],
        }),
        new HtmlWebpackPlugin({template: './src/index.html'})
    ],
};
