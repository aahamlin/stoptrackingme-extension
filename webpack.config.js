const path = require("path");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

// elm stuff
var config = {

    entry: {
        popup: [
            './elm/index.js'
        ]
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },

    module: {
        rules: [
            {
                test: /\.(html|css)$/,
                exclude: /node_modules/,
                loader: 'file-loader?name=[name].[ext]',
            },
            {
                test: /\.elm$/,
                exclude: [ /elm-stuff/, /node_modules/ ],
                loader: 'elm-webpack-loader?verbose=true',
                options: {
                    cwd: path.resolve(__dirname, 'elm'),
                    //optimize: true,
                },
            },
        ],

        noParse: /\.elm$/,
    },

    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: '{config,icons}/*' },
                { from: 'manifest.json' },
                { from: 'src/**/*.*',
                  flatten: true,
                },
            ],
        }),
    ],

    devServer: {
        contentBase: path.join(__dirname, 'dist'),

    },
};

module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        config.module.rules[1].options['optimize'] = true;
    }
    return config;
};
