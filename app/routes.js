var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var Http = require('http');
var converter = require('./converter.js');

var pvdaqKey = 'dKI1nywdVEQTvB6Ra84sceIXTKFIaCxo8rxMFV2u';
var pvdaqAuth = 'Basic ' + new Buffer('dbergh:6cV867c2UjW').toString('base64');  // XXX make these user inputs
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');
var oSparcPostOptions = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml',
	}
    };
    

// Poke TS into oSPARC
function addTS( tsXML ) {

    var req = Http.request(oSparcPostOptions, function(res) {
	    
	console.log('addTS STATUS: '+res.statusCode);

	res.on('data', function(chunk) {

	    console.log( 'addPlant reply BODY: '+chunk);
	});
	
	req.on('error', function(e) {
		console.log("ERROR: " + e.message);
        });
	
    });

    req.write( tsXml );
    req.end();
}

// Poke plant into oSPARC
function poke( mdXml,tsXml ) {

    var req = Http.request(oSparcPostOptions, function(res) {
	    
	console.log('addPlant STATUS: '+res.statusCode);

	res.on('data', function(chunk) {
	    console.log( 'addPlant reply BODY: '+chunk);
		
	    if ( res.statusCode == 200 ) {
		
		addTS( txXml );
	    }
	});
	
	req.on('error', function(e) {
		console.log("ERROR: " + e.message);
	});
    });
    
    req.write( mdXml );
    req.end();
}

// Retrieve plant historical energy
function getTS( plantMD,plantId,start,end,plantMD ) {

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

		mdXml = converter.toMDPed( plantMD, plantTS );
		console.log( mdXml );
		tsXml = converter.toTSPed( plantMD, plantTS );
		console.log( tsXml );

		poke( mdXml, tsXml );
	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};

// Retrieve plant meta-data
function getPlantFromPVDAQ(firstPlantId,numPlants){

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

		getTS( plantMD, firstPlantId, startDate, '12/01/2014', plantMD );

	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });

};


module.exports = function(app) {

    // api ---------------------------------------------------------------------

    // get all
    app.get('/api/import', function(req, res) {
	res.json('ready...'); // return all records in JSON format
    });

    // import the plants specified in the req
    app.post('/api/import', function(req, res) {

	getPlantFromPVDAQ( req.body.startSystemId, req.body.numSystemIds );

	res.json( 'import started with system_id '+req.body.startSystemId+' for '+req.body.numSystemIds+' ids');
    });

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
	console.log("* got req:" + req.url);
	// load the single view file (angular will handle the page changes on the front-end)
        res.sendfile('./public/index.html'); 
    });

};



