// Two calls are made to PVDAQ for each plant.
// The first retrieves the plant meta-data (location etc); the second retrieves time-series history.
// PVDAQ does not store address info, rather only lat/long, so a call is made to and API to retrieve that info.
// Once all is assembled, the oSPARC API is called to add the plant.  Here too, there are two calls:
// Meta-data and time-series history.
// Each step is handled by a function; read this file from bottom to top to see the sequence of events.

//add timestamps in front of log messages
require('console-stamp')(console, '[HH:MM:ss.l]');

var fs = require('fs');
var pvdaq = require('./pvdaqStateMachine.js');
var pvoutput = require('./pvoutputStateMachine.js');

function pvdaqAsync(item, callback) {
    pvdaq.getPlantMD( item );
    //    pvdaq.getPlantTS( item, '01/01/2014', '01/01/2014' );
    setTimeout(function() { callback(); }, 2000);
}

function pvoutputAsync(item, callback) {
    pvoutput.getPlantMD( item );
    setTimeout(function() { callback(); }, 15000);
}

function final(results) { console.log('Done', results); }

function seriesImport( source, items ) {
    var results = [];
    var item = items.shift();
    if(item) {
	switch ( source ) {
	case 'pvdaq':
	    pvdaqAsync( item, function(result) {
		    results.push(result);
		    return seriesImport(source,items);
	    });
	    break;
	case 'pvoutput':
	    pvoutputAsync( item, function(result) {
		    results.push(result);
		    return seriesImport(source,items);
	    });
	    break;
	}
    } else {
	return final(results);
    }
}

var items = [];

function startImport( source, startSystemId, numSystemIds ) {
    var i;
    for ( i = 0; i < numSystemIds; i++ ) {
	items[i] = parseInt( startSystemId ) + i;
    }

    fs.appendFileSync( source+'_attempts.txt', new Date().toLocaleTimeString()+'\r\n' );
    
    seriesImport(source,items);
}

//
// MAIN entry point, called by client
//
module.exports = function(app) {

    // api ---------------------------------------------------------------------

    // get all
    app.get('/api/import', function(req, res) {
	res.json('ready...');
    });

    // import the plants specified in the req from pvdaq
    app.post('/api/import/pvdaq', function(req, res) {

	console.log( '/api/import/pvdaq' );

	startImport( 'pvdaq', req.body.startSystemId, req.body.numSystemIds );

	res.json( 'PVDAQ import started with system_id '+req.body.startSystemId+' for '+req.body.numSystemIds+' ids');
    });

    // import the plants specified in the req from pvoutput
    app.post('/api/import/pvoutput', function(req, res) {

	console.log( '/api/import/pvoutput' );

	startImport( 'pvoutput', req.body.startSystemId, req.body.numSystemIds );

	res.json( 'PVDOUTPUT import started with system_id '+req.body.startSystemId+' for '+req.body.numSystemIds+' ids');
    });

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
	console.log("* got req:" + req.url);
	// load the single view file (angular will handle the page changes on the front-end)
        res.sendfile('./public/index.html'); 
    });

};



