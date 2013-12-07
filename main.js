/*
 * JavaScript API for the reaver npm app.
 */

var spawn  = require('./lib/spawn'),
    server = require('./lib/server'),
    build  = require('./lib/build');

/**
 * Export module code.
 */
module.exports = {
  
  /**
   * @param {String} dir - A path to a project directory.
   */
  "build"  : build,

  /**
   * @param {String} dir  - A path to a directory where we'll spawn a new project.
   * @param {String} name - The new project's name.
   */
  "spawn"  : spawn,

  /**
   * @param {String}        dir     - A path to a directory to serve.
   * @param {Number|String} portNum - A number to use as a port for serving the site.
   */
  "server" : server
};








