module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        trailing: true
      },
      target: {
        src : [
               'index.js'
               ]
      }
    },
    jscs: {
      options: {
        config: '.jscs.json'
      },
      main: [
               'index.js'
             ]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks("grunt-jscs-checker");
  grunt.registerTask('default', ['jshint', 'jscs']);
};