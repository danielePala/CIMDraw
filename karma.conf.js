module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'riot'],
        plugins: [
            'karma-jasmine',
            'karma-coverage',
            'karma-firefox-launcher',
            'karma-riot'
        ],
        files: [
            'js/*.js',
            'js/riot/*.js',
            'js/*.tag',
            'js/D3/*.js',
            'js/d3-context-menu/*.js',
            'js/jquery/*js',
            'js/bootstrap/*.js',
            'js/bootstrap-fileinput/*.js',
            'js/bootstrap-select/*.js',
            'js/JSZip/*.js',
            { pattern: 'rdf-schema/*.rdf', watched: true, served: true, included: false },
            'spec/*.js'
        ],
        browsers: ['FirefoxDeveloper'],
        singleRun: true,
        reporters: ['progress', 'coverage'],
        preprocessors: {
            'js/*.tag': ['riot'], //'coverage'],
            'js/*.js': ['coverage']
        },
        proxies: {
            "/rdf-schema/": "/base/rdf-schema/"
        },
    });
};

