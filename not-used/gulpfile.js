/**
 * Created by atreydos on 9/28/17.
 */
var gulp = require('gulp');
var winInstaller = require('electron-windows-installer');

gulp.task('default', ['create-windows-installer']);

gulp.task('create-windows-installer', function(done) {
    winInstaller({
        appDirectory: './Awery ERP-win32-ia32',
        outputDirectory: '.',
        arch: 'ia32'
    }).then(done).catch(done);
});