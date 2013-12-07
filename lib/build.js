/**
 * Builds a new directory from the application source.
 */

var fs            = require('fs'),
    utils         = require('./utils'),
    converter     = require('./fileconverter'),
    path          = require('path'),
    starSlash     = /^\*?[\/\\]*|[\/\\]*$/g,
    ignoredFiles  = {},
    starredIgnore = {};

/**
 * Adds all necessary items to the ignoredFiles variable.
 *
 * @param {String} base   - The base path from which to resolve paths.
 * @param {Object} config - The object created by config.json
 *
 * @returns {void}
 */
function createIgnorePaths(base, config) {
  var star = /^\*/;
  ignoredFiles[path.resolve(base, 'config.json')]   = true;
  ignoredFiles[path.resolve(base, '.reaver_cache')] = true;
  ignoredFiles[path.resolve(base, '_build')]        = true;
  config.ignore.map(function (each) {
    if (star.test(each)) {
      starredIgnore[each.replace(starSlash, '')] = true;
    } else {
      ignoredFiles[path.resolve(base, each)] = true;
    }
  });
}

/**
 * Determines whether or not a file/dir name matches an
 * entry in the starredIgnore object.
 *
 * @param {String} fileName - The file/dir name.
 *
 * @returns {Boolean}
 */
function isStarredIgnore(fileName) {
  var clean = fileName.replace(starSlash, '');
  return utils.hasProp(starredIgnore, clean);
}

/**
 * Determines whether or not a given path/file should be ignored.
 *
 * @param {String} realPath  - The full path to the file/dir.
 * @param {String} fileOrDir - The file/dir name.
 *
 * @returns {Boolean} - True if we should ignore this path.
 */
function shouldIgnore(realPath, fileOrDir) {
  
  /*
   * We should ignore the path if it's in the ignoredFiles object or
   * if the file/dir name begins with a dot.
   */
  if (utils.hasProp(ignoredFiles, realPath) || utils.isDotName(fileOrDir)) {
    return true;
  }

  /*
   * We should ignore the path if it matches a starred ignore.
   */
  if (isStarredIgnore(fileOrDir)) {
    return true;
  }

  /*
   * Otherwise, we should not ignore the path.
   */
  return false;
}

/**
 * Copies a file from its original location to the build directory
 * and does compilation if necessary.
 *
 * @param {utils.FileMeta} meta     - Contains information related to compiling this file.
 * @param {Boolean}        silence  - If true, show no output For use with `reaver server`
 * @param {String}         name     - The file name.
 * @param {Boolean}        noWatch  - If true, don't set up a watcher where we otherwise would.
 *
 * @returns {void}
 */
function convertFile(meta, silence, name, noWatch) {
  var contents, beginTime = utils.timeStamp(), endTime;

  meta.watchResponse = function () {
    convertFile(meta, false, name, true);
  };

  /*
   * Capture the text of the file.
   */
  contents = fs.readFileSync(meta.origPath);

  /*
   * If this is a file we mean to compile, compile it and write the output.
   */
  if (meta.compile) {
    fs.writeFileSync(meta.newPath, converter.compile(meta, contents.toString()))
  
  /*
   * Otherwise, just copy it.
   */
  } else {
    fs.writeFileSync(meta.newPath, contents);
  }

  endTime = utils.timeStamp();

  /*
   * Tell the user what we're doing...
   */
  !silence && console.log('FILE - ' + name + ' - ' + (endTime - beginTime) + 'ms');

  /*
   * If we have true for silence, watch the file for changes
   * because we only have true for silence when build is called
   * by server.
   */
  if (silence === true) {
    fs.watch(meta.origPath, {}, function (event) {
      if (event === 'change') {
        meta.watchResponse();
      }
    });
  }
}

/**
 * Copies files from the project directory to the build directory
 * and does various file type compilations along the way.
 *
 * @param {String} dirPath     - The path to the project directory
 * @param {Array}  dirContents - An array of file/dir names inside the project directory
 * @param {String} buildDir    - The path to the build directory
 * @param {Object} silence     - If true, show no output. For use with `reaver server`
 *
 * @returns {void}
 */
function copyFiles(dirPath, dirContents, buildDir, silence) {

  /*
   * Loop over each file in dirContents...
   */
  dirContents.map(function (each) {

    /*
     * Get the full path to the file,
     * the full path intended for the new file,
     * and whether or not it is a directory.
     */
    var realPath = path.resolve(dirPath, each),
        newPath  = path.resolve(buildDir, each),
        isDir    = utils.isDir(realPath),
        beginTime,
        endTime,
        meta;

    /*
     * Die if the user told us to ignore this file/dir or if we can
     * determine that this is a dot-prefixed file/dir.
     */
    if (shouldIgnore(realPath, each)) {
      return;

    /*
     * Otherwise...
     */
    } else {
      
      /*
       * If this is a file and not a directory, copy the file.
       */
      if (!isDir) {
        meta = new utils.FileMeta(realPath, buildDir, each);
        convertFile(meta, silence, each);

      /*
       * Otherwise, if this is a directory, create the new
       * directory and recurse with the contents. Make sure
       * recursion is in the tail position.
       */
      } else {

        beginTime = utils.timeStamp();
        fs.mkdirSync(newPath);
        endTime = utils.timeStamp();
        
        /*
         * Tell the user what we're doing...
         */
        !silence && console.log('DIR  - ' + each + ' - ' + (endTime - beginTime) + 'ms');

        return copyFiles(realPath, fs.readdirSync(realPath), newPath, silence);
      }
    }
  });
}

/**
 * Builds a static site from the project files.
 *
 * @param {String} dir     - A path to a project directory.
 * @param {Object} silence - If true, show no output. For use with `reaver server`
 *
 * @returns {void}
 */
function build(dir, silence) {
  var beginTime = utils.timeStamp(),
      buildDir  = path.resolve(dir, silence ? '.reaver_cache' : '_build'),
      config    = JSON.parse(fs.readFileSync(path.resolve(dir, 'config.json')).toString()),
      dirContents,
      endTime;

  /*
   * Tell the user what we're doing.
   */
  !silence && console.log('\nBuilding...\n\n---\n');

  /*
   * Create our collection of paths to ignore.
   */
  createIgnorePaths(dir, config);

  /*
   * Destroy any previous build and cache.
   * Only destroy _build if the buildDir is _build.
   * Only destroy .reaver_cache if the buildDir is .reaver_cache
   * The buildDir is chosen by whether or not we have true for silence.
   */
  if (!silence) {
    if (utils.isDir(path.resolve(dir, '_build'))) {
      utils.removeDir(path.resolve(dir, '_build'));
    }
  } else {
    if (utils.isDir(path.resolve(dir, '.reaver_cache'))) {
      utils.removeDir(path.resolve(dir, '.reaver_cache'));
    }
  }

  /*
   * Once the build and cache are gone, read the directory
   * contents.
   */
  dirContents = fs.readdirSync(dir);

  /*
   * Create the build directory.
   */
  fs.mkdirSync(buildDir);

  /*
   * Copy all necessary files to the build directory.
   */
  copyFiles(dir, dirContents, buildDir, silence);

  endTime = utils.timeStamp();

  /*
   * Tell the user what we're doing...
   */
  !silence && console.log('\n---\n\nFinished building in ' + (endTime - beginTime) + 'ms.\n');

  /*
   * If we're not launching a server, end the process.
   */
  !silence && process.exit(0);
}

/*
 * Export module code.
 */
module.exports = build;
