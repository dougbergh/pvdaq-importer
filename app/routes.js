// Two calls are made to PVDAQ for each plant.
// The first retrieves the plant meta-data (location etc); the second retrieves time-series history.
// PVDAQ does not store address info, rather only lat/long, so a call is made to and API to retrieve that info.
// Once all is assembled, the oSPARC API is called to add the plant.  Here too, there are two calls:
// Meta-data and time-series history.
// Each step is handled by a function; read this file from bottom to top to see the sequence of events.


var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var Http = require('http');
var converter = require('./converter.js');

var pvdaqKey = 'dKI1nywdVEQTvB6Ra84sceIXTKFIaCxo8rxMFV2u';
var pvdaqAuth = 'Basic ' + new Buffer('dbergh:6cV867c2UjW').toString('base64');  // XXX make these user inputs
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');
    
//
// Poke TS into oSPARC
//
function pokeTS( uuid, tsXML ) {

var options = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant/'+uuid+'/timeseries',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    
    var req = Http.request(options, function(res) {
	    
	console.log('addTS STATUS: '+res.statusCode);

	res.on('data', function(chunk) {

	    console.log( 'addTS reply BODY: '+chunk);

	});
	
	req.on('error', function(e) {
		console.log("ERROR: " + e.message);
        });
	
    });

    req.write( tsXml );
    req.end();
}

//
// Poke plant into oSPARC, starting with MD
//
function pokeMD( mdXml, tsXml ) {

var options = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    var req = Http.request(options, function(res) {
	    
	console.log('addPlant STATUS: '+res.statusCode);

	res.on('data', function(uuid) {
	    console.log( 'addPlant reply BODY: '+uuid);
		
	    if ( res.statusCode == 200 ) {
		
		pokeTS( uuid, tsXml );
	    }
	});
	
	req.on('error', function(e) {
		console.log("ERROR: " + e.message);
	});
    });
    
    req.write( mdXml );
    req.end();
}

//
// Convert JSON retrieved from PVDAQ to PED suitable for oSPARC
//
function convert( plantMD, plantTS ) {

    mdXml = converter.toMDPed( plantMD, plantTS );
    console.log( mdXml );
    console.log( '\r\n\r\n\r\n\r\n\r\n Time Series: \r\n' );
    console.log( plantTS );
    tsXml = converter.toTSPed( plantMD, plantTS );
    console.log( tsXml );

    pokeMD( mdXml, tsXml );
}

//
// PVDAQ returned lat & long.  Get state and postal code from that.
//
function getAddress( plantMD, plantTS ) {

    // some pvdaq db entries are wrong, their long is positive
    var long = new String( plantMD.site_longitude );
    if ( long.charAt(0) != '-' )
	plantMD.site_longitude = '-'+plantMD.site_longitude;

    var options = {
	'host':'maps.googleapis.com',
	'path':'/maps/api/geocode/json?latlng='+plantMD.site_latitude+','+plantMD.site_longitude,
	'headers': {
	    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	    'Accept-Language':'en-US,en;q=0.8,de;q=0.6'
	}
    };

    Http.get(options, function(res2) {
	    
	var tsData = '';
	
	res2.on('data', function(dataReply) {
	    tsData += dataReply;
        });
	
	res2.on('end', function(endReply) {

            console.log( 'geocode STATUS: '+res2.statusCode );
	    
	    address = JSON.parse( tsData );

	    var components = address.results[0].address_components;

	    var state = '';
	    var zip = '';

	    components.forEach( function( component ) {

		component.types.forEach( function( type ) {

		    if ( type == "administrative_area_level_1" )
			state = component.short_name;
		    if ( type == "postal_code" ) 
			zip = component.short_name;
		});
	    });

	    if ( state.length > 0 )
		plantMD.state = state;
	    if ( zip.length > 0 )
		plantMD.zip = zip;

	    convert( plantMD, plantTS );
	});

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
    });

}

//
// Retrieve plant historical energy
//
function getPlantTS( plantMD, plantId, start, end ) {

	var options = {
	    host:'developer.nrel.gov',
	    path:'/api/pvdaq/v3/site_data.json?api_key='+pvdaqKey+'&system_id='+plantId+'&aggregate=monthly&start_date='+start+'&end_date='+end,
	    headers:{
		'Authorization':pvdaqAuth,
		'Connection':'close'  // make the 'end' event happen sooner
	    }
	};

	Http.get(options, function(res2) {

	    console.log('getEnergy STATUS: '+res2.statusCode);

	    var tsData = '';

	    res2.on('data', function(dataReply) {
	        tsData += dataReply;
	    });

	    res2.on('end', function(endReply) {

		var plantTS = JSON.parse( tsData ).outputs;

		getAddress( plantMD, plantTS );
	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};

//
// Retrieve plant meta-data
//
function getPlantMD( firstPlantId, numPlants ){

	var options = {
	    host:'developer.nrel.gov',
	    path:'/api/pvdaq/v3/sites.json?api_key='+pvdaqKey+'&system_id='+firstPlantId,
	    headers:{
		'Authorization':pvdaqAuth
	    }
	};
	
	Http.get(options, function(res2) {

	    console.log('getMeta STATUS: '+res2.statusCode);

	    res2.on('data', function(nrelReply) {

		var plantMD = JSON.parse( nrelReply ).outputs[0];
		console.log( plantMD );

		var startDate = converter.getFirstYear( plantMD );

		getPlantTS( plantMD, firstPlantId, startDate, '12/01/2014' );

	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};


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

	getPlantMD( req.body.startSystemId, req.body.numSystemIds );

	res.json( 'import started with system_id '+req.body.startSystemId+' for '+req.body.numSystemIds+' ids');

    });

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
	console.log("* got req:" + req.url);
	// load the single view file (angular will handle the page changes on the front-end)
        res.sendfile('./public/index.html'); 
    });

};



