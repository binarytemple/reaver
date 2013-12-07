/**
 * Some general utilities for getting the job done.
 */

var fs      = require('fs'),
    wrench  = require('wrench'),
    fm      = require('yaml-front-matter'),
    types   = require('./compiletypes'),
    pathMod = require('path'),
    dotEnd  = /\.$/,
    output;

/**
 * Shortcut for Object.prototype.hasOwnProperty
 */
function hasProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = output = {

  /**
   * Shortcut for Object.prototype.hasOwnProperty.
   */
  "hasProp" : hasProp,

  /**
   * Shortcut for getting time in milliseconds.
   */
  "timeStamp" : function () {
    return (new Date()).getTime();
  },

  /**
   * A .map method for objects.
   *
   * @param {Object}   obj - An object to loop over.
   * @param {Function} fn  - A function to call for each item in the object.
   */
  "objectMap" : function (obj, fn) {
    var i;
    for (i in obj) {
      if (hasProp(obj, i)) {
        fn(obj[i], i);
      }
    }
  },

  /**
   * Creates a useful error and terminates the program.
   * Allows you to choose whether or not to throw a nasty
   * real error with a stack trace.
   *
   * @param {String}  reason         - The reason for the error.
   * @param {Boolean} throwRealError - Whether you want to throw a real error.
   *
   * @returns {void}
   */
  "err" : function (reason, throwRealError) {
    if (throwRealError) {
      throw new Error(reason);
    } else {
      console.log('Error: ' + reason);
      process.exit(1);
    }
  },

  /**
   * Determines whether or not a file/dir begins with a dot,
   * usually indicating it should be ignored.
   *
   * @param {String} path - The path to the file/dir.
   *
   * @returns {Boolean} - True if this is a dot path, false if not.
   */
  "isDotName" : function (name) {
    return /^\./.test(name);
  },

  /**
   * Determines whether a path leads to a directory.
   *
   * @param {String} path - A path name.
   *
   * @returns {Boolean}
   */
  "isDir" : function (path) {
    if (fs.existsSync(path)) {
      return fs.statSync(path).isDirectory();
    }
    return false;
  },

  /**
   * Determines whether a path leads to a file.
   *
   * @param {String} path - A path name.
   *
   * @returns {Boolean}
   */
  "isFile" : function (path) {
    if (fs.existsSync(path)) {
      return fs.statSync(path).isFile();
    }
    return false;
  },

  /**
   * Determines whether a path name matches any expression in
   * a list of regular expressions.
   *
   * @param {Array}  exprList - An array of regexps
   * @param {String} path     - A path name
   *
   * @returns {Regexp|Boolean} - The first regexp to produce a truthy
   *                             test or false if there were no matches.
   */
  "matchesListOf" : function (exprList, path) {
    var i, len = exprList.length;
    for (i = 0; i < len; i += 1) {
      if (exprList[i].test(path)) {
        return exprList[i];
      }
    }
    return false;
  },

  /**
   * Recursively deletes a directory and everything beneath it.
   *
   * @param {String} path - A path name to a directory.
   *
   * @returns {void}
   */
  "removeDir" : function (path) {
    if (!this.isDir(path)) {
      this.err('Attempt to remove non-directory file <' + path + '> as a directory.');
    }
    wrench.rmdirSyncRecursive(path);
  },

  /**
   * @constructor
   *
   * Gathers some relevant meta data on a given file regarding how we
   * ought to compile it.
   *
   * @param {String} path     - A path to a file.
   * @param {String} buildDir - The new directory where we need to put the file.
   * @param {String} fileName - The name and extension of the file.
   *
   * @key origPath      - The full path to the original file.
   * @key prefix        - The full path excluding all extensions on the file.
   * @key isLayout      - Whether or not this is a layout file.
   * @key isPartial     - Whether or not this is a partial file.
   * @key compile       - Whether or not this file needs to be compiled.
   * @key compileTarget - The target file extension indicating what we're compiling to.
   * @key compileType   - The current file extension indicating the type of file this is.
   * @key newPath       - The full path to the new file we're creating.
   *
   * @returns {void}
   */
  "FileMeta" : function (path, buildDir, fileName) {
    var extRegexp = /(\.[^\.\/\\]+)+$/,
        extString = ((path.match(extRegexp) || [])[0]) || '',
        extArray  = extString.replace(/^\./, '').split('.');

    /*
     * Capture the original path and the name of the file.
     */
    this.origPath = path;
    this.prefix   = fileName.replace(extRegexp, '') + '.' + extArray.slice(0, extArray.length - 2).join('.');

    /*
     * Clean up the extension array.
     */
    extArray = extArray.slice(extArray.length - 2);

    /*
     * Capture whether this is a layout or a partial file. If so,
     * set the appropriate property and remove that piece from the extArray.
     */
    if (extArray[0] === 'layout' || extArray[0] === 'partial') {
      extArray[0] === 'layout' ? (this.isLayout = true) : (this.isPartial = true);
      extArray = extArray.slice(1);
    }

    /*
     * Capture whether or not we want to compile this file and the target file
     * extension it should recieve.  Slice this piece off of the extArray.
     */
    if (extArray.length > 1) {

      /*
       * We want to compile this file if it is not a layout or a partial and
       * if we actually have a compile type matching the extension.
       */
      if (!this.isLayout && !this.isPartial && hasProp(types, extArray[1])) {
        this.compile = true;
        this.compileTarget = extArray[0];
      } else {

        /*
         * If we don't have a matching compile type, it could be something
         * like .min.js.  In that case, we'll put the .min back onto the prefix.
         */
        if (!hasProp(types, extArray[1])) {
          this.prefix = this.prefix + 
                        (dotEnd.test(this.prefix) ? '' : '.') + 
                        extArray[0] + '.';
        }

      }
      extArray = extArray.slice(1);
    }

    /*
     * Put the leftover extension back together and track the original
     * extension.
     */
    extString = extArray.join('.');
    this.compileType = extString;

    /*
     * Capture just the build directory.
     */
    this.buildDir = buildDir;

    /*
     * Capture the original directory.
     */
    this.origDir = buildDir.replace(/(\/|\\)+(\_build|\.reaver\_cache)(\/|\\|$)/, '$3');

    /*
     * Capture what the full path to the output will be.
     */
    this.newPath = pathMod.resolve(buildDir, this.prefix + (this.compileTarget || this.compileType));
    
    /*
     * In the case that a file may not have an extension, such as in the
     * case of a LICENSE file or MAKEFILE, remove the '.' that has been
     * placed on the end.
     */
    this.newPath = this.newPath.replace(/\.$/, '');
  },

  /**
   * Retrieves YAML frontmatter from the beginning of a file.
   *
   * @param {String} str - A string of text from the file.
   *
   * @key content - The content that follows the frontmatter.
   * @key matter  - The parsed frontmatter.
   *
   * @returns {Object} - Contains matter and content.
   */
  "FrontMatter" : function (str) {
    var match = fm.loadFront(str), i;
    if (match) {
      this.content = match.__content;
      delete match.__content;
    } else {
      this.content = str;
    }
    this.matter = match;
  },

  /**
   * Searches for the last index of an item within a string
   * or collection.  Uses a loop if .lastIndexOf is not available.
   *
   * @param {Array|String} data - a string or ordered collection
   * @param                item - any data type
   *
   * @returns {Number} - The position of the index or -1 if it does not exist.
   */
  "lastIndexOf" : function (data, item) {
    var i;

    /*
     * Assume we have the .lastIndexOf method and try to call it.
     */
    try {
      return data.lastIndexOf(item);

    /*
     * If the method is not available, catch the error and find the
     * index with a loop.
     */
    } catch (e) {
      for (i = data.length; i >= 0; i -= 1) {
        if (data[i] === item) {
          return i;
        }
      }
      return -1;
    }
  }
};







