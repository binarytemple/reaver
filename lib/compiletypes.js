/*
 * Functions for compiling various types of files.
 */

var types   = {},
    fs      = require('fs'),
    marked  = require('marked'),
    sass    = require('node-sass'),
    coffee  = require('coffee-script'),
    jade    = require('jade'),
    pathMod = require('path');

/**
 * Compiles scss files to css.
 *
 * @param {Object} data - Universal set of keys passed to all compile fns.
 *
 * @key content - The code string.
 * @key matter  - Any front matter.
 * @key meta    - An instance of utils.FileMeta
 *
 * @returns {String} - The compiled code.
 */
types.scss = function (data) {
  var deps;

  /*
   * If we're not already watching dependents...
   */
  if (!data.meta.depsWatched) {

    /*
     * Get a list of any @import'ed files so we can put watchers on them.
     */
    deps = data.content.replace(/(\/\*[\w\'\s\r\n\*]*\*\/)|(\/\/[^\n]*)/g, '')
                       .match(/\@import\s+[^\;]+\;/g);

    /*
     * Loop over each @import'ed file and put a wacher on it.
     */
    deps && deps.length && deps.map(function (each) {
      each = each.replace(/^\@import\s+(\'|\")?\s*|\s*(\'|\")?\s*\;$/g, '');
      fs.watch(pathMod.resolve(data.meta.origDir, each), {}, function (event) {
        if (event === 'change') {
          data.meta.watchResponse();
        }
      });
    });

    /*
     * Mark that we are now watching dependents.
     */
    data.meta.depsWatched = true;
  }

  /*
   * Compile the file and output the result.
   */
  return sass.renderSync({
    "data"         : data.content,
    "includePaths" : [data.meta.origDir]
  });
};

/**
 * Compiles markdown files to html.
 *
 * @param {Object} data - Universal set of keys passed to all compile fns.
 *
 * @key content - The code string.
 * @key matter  - Any front matter.
 * @key meta    - An instance of utils.FileMeta
 *
 * @returns {String} - The compiled code.
 */
types.markdown = function (data) {
  return marked(data.content);
};
types.md = types.markdown;

/**
 * Compiles coffeescript files to javascript.
 *
 * @param {Object} data - Universal set of keys passed to all compile fns.
 *
 * @key content - The code string.
 * @key matter  - Any front matter.
 * @key meta    - An instance of utils.FileMeta
 *
 * @returns {String} - The compiled code.
 */
types.coffee = function (data) {
  return coffee.compile(data.content);
};

/**
 * Compiles jade files to html.
 *
 * @param {Object} data - Universal set of keys passed to all compile fns.
 *
 * @key content - The code string.
 * @key matter  - Any front matter.
 * @key meta    - An instance of utils.FileMeta
 *
 * @returns {String} - The compiled code.
 */
types.jade = function (data) {
  return jade.compile(data.content)(data.matter);
};

/*
 * Export module code.
 */
module.exports = types;

