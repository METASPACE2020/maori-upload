var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './static/index.jsx',
    output: { path: 'static', filename: 'bundle.js' },
    plugins: [
        // https://github.com/mozilla-services/react-jsonschema-form#build-error-wrt-missing-buffertools-module
        new webpack.IgnorePlugin(/^(buffertools)$/)
    ],
    module: {
        loaders: [
            {
                test: /.jsx?$/,
                include: /static/,
                loader: 'babel?cacheDirectory'
            },
            {
                test: /.css?$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(jpe?g|png|gif|svg)$/,
                loader: "file"
            },
            {
                test: /.json$/,
                loader: 'json'
            }
        ]
    }
};
