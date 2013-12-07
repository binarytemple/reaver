/**
 * The module that handles compiling the various file types.
 */

var fs    = require('fs'),
    utils = require('./utils'),
    types = require('./compiletypes'),
    cache = {};


/**
 * Export module code.
 */
module.exports = {

  /**
   * Compiles a file from one type to another.
   *
   * @param {utils.FileMeta} meta - Contains information related to compiling this file.
   * @param {String}         code - The stringified code inside the file.
   *
   * @returns {String} - The compiled code.
   */
  "compile" : function (meta, code) {
    var frontMatter = new utils.FrontMatter(code),
        data = {},
        layout,
        compiled;

    data.content = frontMatter.content;
    data.matter  = frontMatter.matter;
    data.meta    = meta;

    /*
     * If this file needs to be compiled, compile it.
     */
    try {
      compiled = types[meta.compileType](data);
    } catch (err) {
      console.log('\nCompile Error: ', err);
      console.log('Error occurred at fileconverter:compile()\n');
      process.exit(1);
    }

    /*
     * If the file takes a layout, compile the layout and drop the content in the proper place.
     */
    if (frontMatter.matter && utils.hasProp(frontMatter.matter, 'layout')) {
      layout   = fs.readFileSync(frontMatter.matter.layout).toString(); 
      //Figure out how to compile layouts and drop in "yield" values
      //compiled = types[meta.compileType](layout, compiled);
    }

    /*
     * Return the compiled code.
     */
    return compiled;
  }
};







