/**
 * The dev web server.
 */

var fs        = require('fs'),
    appmeta   = require('./appmeta'),
    readline  = require('readline'),
    http      = require('http'),
    connect   = require('connect'),
    path      = require('path'),
    utils     = require('./utils'),
    build     = require('./build'),
    socket    = require('ws'),
    cmdLine   = require('child_process').exec,
    dsTrigger = {"/datastore" : "/datastore"},
    dsHost    = '127.0.0.1',
    dsPort    = 5984,
    svrPort;

/**
 * Handles a request and a response.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
function dataStore(req, res) {
  var reqURL    = req.socket.parser.incoming.url,
      reqMethod = req.method.toLowerCase(),
      isTrigger = false,
      out;

  /*
   * Determine whether our request URL contains a db trigger.
   * If so, adjust the request URL accordingly.
   */
  utils.objectMap(dsTrigger, function (val, key) {
    var temp, relPath;
    if (reqURL.indexOf(key.replace(/^\.\//, '/')) === 0) {
      isTrigger = true;
      temp      = val.replace(/^\.\//, '');
      relPath   = reqURL.slice(utils.lastIndexOf(reqURL, temp));
      reqURL    = relPath.replace(/^\/*/, '/');
    }
  });
  
  /*
   * If the request url doesn't contain a db trigger,
   * produce the 404;
   */
  if (!isTrigger) {
    res.statusCode = 404;
    res.end();
  
  /*
   * Otherwise, grab data from the database.
   */
  } else {

    /*
     * Create an http request from data in the incoming server request.
     */
    out = http.request(
      {
        "host"   : dsHost,
        "port"   : dsPort,
        "method" : req.method,
        "path"   : reqURL
      },

      /*
       * When we get a response, send it back to the browser.
       */
      function (response) {
        /*
         * As we get data, write it to the umbrella response.
         */
        response.on('data', function (chunk) {
          res.write(chunk);
        });
        /*
         * When we're done getting data, send that sucker back.
         */
        response.on('end', function () {
          res.end();
        });
      }
    );

    /*
     * Handle the case in which the database connection
     * gives us the finger.
     */
    out.on('error', function (err) {
      console.log('\nProblem connecting to the datastore:\n' + err);
      console.log('Is your datastore running?\n');
      out.abort();
      res.statusCode = 404;
      res.end();
    });

    /*
     * Send the request.
     */
    out.end(JSON.stringify(req.body));
  }
}

/**
 * How the websocket does its thang.
 */
function socketProtocol(ws) {
  ws.on('message', function(message) {
    var parsed = JSON.parse(message);
    console.log('WS -', this.upgradeReq.headers.origin, '-', parsed.method, '-', parsed.path, ':', parsed.content);
    ws.send(JSON.stringify({echo: JSON.parse(message)}));
  });
}

/**
 * Initializes connect and starts up a server.
 *
 * @param {Object} options        - Contains the following keys:
 * @key dir       {String}       - The directory to serve.
 * @key port      {Number}       - The port to serve on.
 * @key dsHost    {String}       - An IP or http://hostname hosting a datastore.
 * @key dsPort    {Number}       - A port number for the db host.
 * @key dsTrigger {Array|String} - Request URL paths that will trigger a request to the datastore.
 *
 * @returns {void}
 */
function startServer(options) {
  var cache = path.resolve(options.dir, '.reaver_cache'),
      port  = (options.port ? parseInt(options.port) : 8888),
      svr   = connect().use(connect.favicon())
                       .use(connect.logger('short'))
                       .use(connect.static(cache, {"maxAge" : 86400000}))
                       .use(connect.directory(cache))
                       .use(connect.cookieParser())
                       .use(connect.bodyParser())
                       /*
                        * Pass in a function for handling requests and responses
                        * when connect.static doesn't have a matching file to serve.
                        */
                       .use(dataStore),
      wsSvr,
      temp,
      config;

  /*
   * Track the server port.
   */
  svrPort = options.port || 8888;

  /*
   * Attempt to read in the config file.
   */
  try {
    config = JSON.parse(fs.readFileSync(path.resolve(options.dir, 'config.json')).toString());
  } catch (err) {
    utils.err('Directory is missing config.json or config.json has errors.');
  }

  /*
   * If there is no datastore information passed in, attempt to find
   * it in the config file. If it's in there, add it to the options
   * object as if it had been passed in by the user. This way, we won't
   * have to try to find it in two places later on.
   */
  if (!options.dsTrigger && !options.dsHost && !options.dsPort) {
    config.dev && config.dev.dsTrigger && (options.dsTrigger = config.dev.dsTrigger);
    config.dev && config.dev.dsHost    && (options.dsHost    = config.dev.dsHost);
    config.dev && config.dev.dsPort    && (options.dsPort    = config.dev.dsPort);
  }

  /*
   * Set up the datastore connection information.
   */
  if (typeof options.dsTrigger === 'string') {
    temp = {};
    temp[options.dsTrigger] = options.dsTrigger;
    options.dsTrigger = temp;
  }
  options.dsTrigger && (dsTrigger = options.dsTrigger);
  options.dsHost    && (dsHost    = options.dsHost);
  options.dsPort    && (dsPort    = options.dsPort);

  /*
   * Enable a websocket on the port just above our server port.
   */
  wsSvr = new socket.Server({
    port: svrPort + 1
  }).on('connection', socketProtocol);

  /*
   * Create some output and kickstart this sucka.
   */
  console.log('');
  console.log('/********************************************************');
  console.log(' * Getting ready...');

  /*
   * Create a build in the .reaver_cache directory and secretly serve the cache directory.
   * Pass in true to make sure the build happens in the .reaver_cache directory and
   * to prevent the build from showing output.
   */
  build(options.dir, true);

  console.log(' * Reaver is listening on port ' + port);
  console.log(' ********************************************************/\n');
  console.log('Watching for changes in ' + cache.replace(/(\.reaver_cache|\_build)([\/\\]+)?$/, '') + ' ...\n');
  http.createServer(svr).listen(port);

  /*
   * Prompt and wait for CLI commands.
   */
  startReading();
}

/**
 * When the server is given a command, process it.
 */
function takeInput(command) {
  var cmd = command.toLowerCase().replace(/\s+/g, ' ').trim();

  /*
   * Shut down the server if the user asks for it.
   */
  if (/^(quit|close|exit)(\(\))?$/.test(cmd)) {
    process.exit(0);
  }

  /*
   * Otherwise, intelligently process each command.
   */
  switch (cmd) {

    /*
     * Retrieve version number.
     */
    case 'version':
      console.log(appmeta.version);
      break;

    /*
     * Retrieve license.
     */
    case 'license':
      console.log(appmeta.license);
      break;

    /*
     * Retrieve usage information.
     */
    case 'help':
      console.log(appmeta.help);
      break;

    /*
     * Open the site in a the default browser.
     */
    case 'open':
      console.log('Opening...');
      cmdLine('open http://localhost:' + svrPort);
      break;

    /*
     * In the case of an empty string, don't do anything.
     */
    case '':
      break;

    /*
     * Log an unrecognized message in the default case.
     */
    default:
      console.log('Command <' + cmd + '> is not recognized.');
  }
}

/**
 * Creates a command line interface for passing commands to the server.
 */
function startReading() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.setPrompt('(' + appmeta.version + ')> ');
  rl.prompt();
  rl.on('line', function (command) {
    takeInput(command);
    rl.prompt();
  });
}

/**
 * Export the startServer function as our module API.
 */
module.exports = startServer;
