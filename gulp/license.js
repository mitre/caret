'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var concat = require('gulp-concat');

var fs = require('fs');


gulp.task('license', function() {
  var a = gulp.src(path.join(conf.paths.lic, '*.txt'));

  var licenses = [];
  a.on('data', function(chunk) {
    var contents = chunk.contents.toString().trim(); 
    var filename = chunk.path.split('\\');
    filename = filename[filename.length - 1].split('.');
    if (filename.length > 1) {
      filename.pop();
    }
    filename = filename.join('.');

    if (contents.length > 1) {
      process.stdout.write(JSON.stringify({name: filename, pre: contents}) + ',\n');
    }
  }); 
});