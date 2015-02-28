// Two calls are made to PVDAQ for each plant.
// The first retrieves the plant meta-data (location etc); the second retrieves time-series history.
// PVDAQ does not store address info, rather only lat/long, so a call is made to and API to retrieve that info.
// Once all is assembled, the oSPARC API is called to add the plant.  Here too, there are two calls:
// Meta-data and time-series history.
// Each step is handled by a function; read this file from bottom to top to see the sequence of events.

//add timestamps in front of log messages
require('console-stamp')(console, '[HH:MM:ss.l]');

var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var series = require('./seriesImport.js');

var items = [];

//
// MAIN entry point, called by client
//
module.exports = function(app) {

    // api ---------------------------------------------------------------------

    // get all
    app.get('/api/import', function(req, res) {
	res.json('ready...'); // return all records in JSON format
    });

    // import the plants specified in the req
    app.post('/api/import', function(req, res) {

	    //	    req.body.startSystemId, req.body.numSystemIds
	    var i;
	    for ( i = 0; i < req.body.numSystemIds; i++ ) {
		items[i] = parseInt( req.body.startSystemId ) + i;
	    }

	    series.seriesImport(items);

	    res.json( 'import started with system_id '+req.body.startSystemId+' for '+req.body.numSystemIds+' ids');
	});

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
	console.log("* got req:" + req.url);
	// load the single view file (angular will handle the page changes on the front-end)
        res.sendfile('./public/index.html'); 
    });

};



