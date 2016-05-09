var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './static/index.jsx',
    output: { path: 'static', filename: 'bundle.js' },
    module: {
        loaders: [
            {
                test: /.jsx?$/,
                include: /static/,
                loader: 'babel?cacheDirectory'
            },
            {
                test: /.json$/,
                loader: 'json'
            }
        ]
    }
};
