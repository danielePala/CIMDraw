module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine'],
        files: [
            'js/*.js',
            'js/riot/*.js',
            'js/D3/*.js',
            'js/JSZip/*.js',
            { pattern: 'rdf-schema/*.rdf', watched: true, served: true, included: false },
            'spec/*.js'
        ],
        browsers: ['FirefoxDeveloper'],
        singleRun: true,
        reporters: ['progress', 'coverage'],
        preprocessors: {
            'js/*.js': ['coverage']
        },
        proxies: {
            "/rdf-schema/": "/base/rdf-schema/"
        },
    });
};

