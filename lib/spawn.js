/**
 * The process for creating a new project directory.
 */

var fs     = require('fs'),
    path   = require('path'),
    utils  = require('./utils'),
    github = require('simple-github');

/**
 * Creates a .gitignore file.
 *
 * @param {String} file - A path to the new file.
 *
 * @returns {void}
 */
function createGitIgnore(file) {
  var contents = [
      '\n.reaver_cache'
    , '\n_build'
  ];
  console.log('Creating file: ' + file + '...');
  fs.writeFileSync(file, contents);
}

/**
 * Creates a README.md file.
 *
 * @param {String} file - A path to the new file.
 * @param {String} name - The name of the new reaver project.
 *
 * @returns {void}
 */
function createReadme(file, name) {
  var contents = [
      '\n' + name
    , '\n===',
    , '\n'
  ].join('');
  console.log('Creating file: ' + file + '...');
  fs.writeFileSync(file, contents);
}

/**
 * Creates a config.json file.
 *
 * @param {String} file - A path to the new config.json file.
 *
 * @returns {void}
 */
function createConfig(file) {
  var contents = [
      '\n{'
    , '\n'
    , '\n  "ignore": ['
    , '\n    ".gitignore",'
    , '\n    "README.md"'
    , '\n  ],'
    , '\n'
    , '\n  "dev": {'
    , '\n    "dsTrigger": {},'
    , '\n    "dsHost": "127.0.0.1",'
    , '\n    "dsPort": "5984"'
    , '\n  }'
    , '\n'
    , '\n}'
    , '\n'
  ].join('');
  console.log('Creating file: ' + file + '...');
  fs.writeFileSync(file, contents);
}

/**
 * Creates an index.html file.
 *
 * @param {String} file - A path to the new index.html file.
 * @param {String} name - The name of this project.
 *
 * @returns {void}
 */
function createIndex(file, name) {
  var contents = [
      '\n<!DOCTYPE html>'
    , '\n<html class="no-js">'
    , '\n<head>'
    , '\n  <meta charset="utf-8">'
    , '\n  <meta http-equiv="X-UA-Compatible" content="IE=edge">'
    , '\n  <title>' + (name || '') + '</title>'
    , '\n  <meta name="description" content="">'
    , '\n  <meta name="viewport" content="width=device-width, initial-scale=1">'
    , '\n'
    , '\n  <!-- Place favicon.ico and apple-touch-icon(s) in the root directory -->'
    , '\n'
    , '\n</head>'
    , '\n<body>'
    , '\n  <archlet role="main"></archlet>'
    , '\n</body>'
    , '\n</html>'
  ].join('');
  console.log('Creating file: ' + file + '...');
  fs.writeFileSync(file, contents);
}

/**
 * Creates a stylesheets directory.
 *
 * @param {String} dir - A path to the new directory.
 *
 * @returns {void}
 */
function createStyles(dir) {
  console.log('Creating dir:  ' + dir + '...');
  fs.mkdirSync(dir);
}

/**
 * Creates a scripts directory.
 *
 * @param {String} dir - A path to the new directory.
 *
 * @returns {void}
 */
function createScripts(dir) {
  var vendor = path.resolve(dir, 'vendor'),
      custom = path.resolve(dir, 'custom');
  console.log('Creating dir:  ' + dir + '...');
  fs.mkdirSync(dir);
  console.log('Creating dir:  ' + vendor + '...');
  fs.mkdirSync(vendor);
  console.log('Creating dir:  ' + custom + '...');
  fs.mkdirSync(custom);
}

/**
 * Creates a images directory.
 *
 * @param {String} dir - A path to the new directory.
 *
 * @returns {void}
 */
function createImages(dir) {
  console.log('Creating dir:  ' + dir + '...');
  fs.mkdirSync(dir);
}

/**
 * Creates a layouts directory.
 *
 * @param {String} dir - A path to the new directory.
 *
 * @returns {void}
 */
function createLayouts(dir) {
  console.log('Creating dir:  ' + dir + '...');
  fs.mkdirSync(dir);
}

/**
 * Creates a templates directory.
 *
 * @param {String} dir - A path to the new directory.
 *
 * @returns {void}
 */
function createTemplates(dir) {
  console.log('Creating dir:  ' + dir + '...');
  fs.mkdirSync(dir);
}

/**
 * Spawns a new, empty reaver project.
 *
 * @param {String} dir  - A path to a new project directory.
 * @param {String} name - The name provided for the project.
 *
 * @returns {void}
 */
function spawn(dir, name) {
  var dirExists = utils.isDir(dir);

  /*
   * Create the directory if it doesn't exist yet.
   */
  if (!dirExists) {
    fs.mkdirSync(dir);
  }

  /*
   * Create a barebones project.
   */
  createGitIgnore (path.resolve(dir, '.gitignore'));
  createReadme    (path.resolve(dir, 'README.md'), name);
  createConfig    (path.resolve(dir, 'config.json'));
  createIndex     (path.resolve(dir, 'index.html'), name);
  createStyles    (path.resolve(dir, 'stylesheets'));
  createScripts   (path.resolve(dir, 'scripts'));
  createImages    (path.resolve(dir, 'images'));
  createLayouts   (path.resolve(dir, 'layouts'));
  createTemplates (path.resolve(dir, 'templates'));

  /*
   * End the process.
   */
  //process.exit(0);
}

/**
 * Export the startServer function as our module API.
 */
module.exports = spawn;
