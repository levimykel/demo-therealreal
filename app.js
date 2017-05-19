/**
 * Module dependencies.
 */
var Prismic = require('prismic-nodejs');
var app = require('./config');
var PORT = app.get('port');
var PConfig = require('./prismic-configuration');
var auth = require('basic-auth');

// Start the server
app.listen(PORT, function() {
  console.log('Point your browser to http://localhost:' + PORT);
});

// Require password 
app.use(function (req, res, next) {
  var credentials = auth(req);

  if (!credentials || credentials.name !== 'therealreal' || credentials.pass !== 'prismic-demo') {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="example"');
    res.end('Access denied');
  } else {
    next();
  }
});

// Middleware to connect to the API
app.use((req, res, next) => {
  Prismic.api(PConfig.apiEndpoint,{accessToken: PConfig.accessToken, req: req})
  .then((api) => {
    req.prismic = {api: api};
    res.locals.ctx = {
      endpoint: PConfig.apiEndpoint,
      linkResolver: PConfig.linkResolver
    };
    next();
  }).catch(function(err) {
    if (err.status == 404) {
      res.status(404).send('There was a problem connecting to your API, please check your configuration file for errors.');
    } else {
      res.status(500).send('Error 500: ' + err.message);
    }
  });
});


/**
* preconfigured prismic preview
*/
app.get('/preview', function(req, res) {
  return Prismic.preview(req.prismic.api, PConfig.linkResolver, req, res);
});


/**
* Homepage Route
*/
app.get('/', function(req, res) {
  
  req.prismic.api.getSingle("homepage").then(function(homepage) {
    
      // Query the banner for the homepage
        req.prismic.api.getByUID('banner', 'homepage').then(function(banner) {

      // Get the array of featured sales links
      var salesIds = [];
      if ( homepage.getGroup('homepage.sales') ) {
        var sales = homepage.getGroup('homepage.sales').toArray();
        sales.forEach(function(sale){
          salesIds.push(sale.getLink('sale').id);
        });
      }

      // Query the sales by their ids
      req.prismic.api.getByIDs(salesIds).then(function(sales) {
        
        // Render the homepage
        res.render('index', {
          content : homepage,
          sales : sales.results,
          banner : banner
        });
      });
    });
  });
});
