module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        loopfunc: true,
        trailing: true
      },
      target: {
        src : [
               'common.js',
               'connections.js',
               'loc.js'
               ]
      }
    },
    jscs: {
      options: {
        config: '.jscs.json'
      },
      main: [
             'common.js',
             'connections.js',
             'loc.js'
             ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks("grunt-jscs-checker");
  grunt.registerTask('default', ['jshint', 'jscs']);
};