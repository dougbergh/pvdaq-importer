var Http = require('http');
var fs = require('fs');
var converter = require('./converter.js');

var pvdaqKey = 'dKI1nywdVEQTvB6Ra84sceIXTKFIaCxo8rxMFV2u';
var pvdaqAuth = 'Basic ' + new Buffer('dbergh:6cV867c2UjW').toString('base64');  // XXX make these user inputs
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');

//
// write result to file to keep track
//    
function logResult( text ) {
    console.log( 'logResult '+process.cwd()+'/pvdaq_ids.txt' );
    fs.appendFileSync( 'pvdaq_ids.txt', text+'\r\n' );
}

//
// Poke TS into oSPARC
//
function pokeTS( plantId,tsXML ) {

    var options = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant/'+plantId+'/timeseries',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    
    var req = Http.request(options, function(plantId,res) {
	    
	console.log('addTS STATUS: '+res.statusCode);
	if ( res.statusCode != 200 ) {
            logResult( plantId+' ... failed' );
	}

	res.on('data', function(plantId,chunk) {
	    if ( res.statusCode == 200 ) 
		logResult( plantId+' ... succeeded' );
	    else
		logResult( plantId+' ... succeeded' );
	});
	
	req.on('error', function(plantId,e) {
	    console.log("ERROR on "+plantId+":" + e.message);
            logResult( plantId+' ... failed' );
        });
	
    });

    req.write( tsXml );
    req.end();
}

//
// Poke plant into oSPARC, starting with MD
//
function pokeMD( plantId, mdXml, tsXml ) {

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
	if ( res.statusCode != 200 ) {
            logResult( plantId+' ... failed' );
	}

	res.on('data', function(plantId) {
		
	    if ( res.statusCode == 200 ) {
		
		pokeTS( plantId, tsXml );
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
    function convert( plantId, plantMD, plantTS ) {

    mdXml = converter.toMDPed( plantMD, plantTS );
    tsXml = converter.toTSPed( plantMD, plantTS );

    pokeMD( plantId, mdXml, tsXml );
}

//
// PVDAQ returned lat & long.  Get state and postal code from that.
//
function getAddress( plantId, plantMD, plantTS ) {

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
	    
	console.log('getAddress STATUS: '+res2.statusCode);
	if ( res2.statusCode != 200 ) {
            logResult( plantId+' ... failed' );
	}

	var tsData = '';
	
	res2.on('data', function(dataReply) {
	    tsData += dataReply;
        });
	
	res2.on('end', function(endReply) {

            console.log( 'geocode STATUS: '+res2.statusCode );

	    if ( res2.statusCode == 200 ) {

		try {
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
		
		convert( plantId, plantMD, plantTS );
		} catch( err ) {
	            console.log( err );
		}
	    }
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

	    console.log('getTS STATUS: '+res2.statusCode);
	    if ( res2.statusCode != 200 ) {
		logResult( plantId+' ... failed' );
	    }

	    var tsData = '';

	    res2.on('data', function(dataReply) {
	        tsData += dataReply;
	    });

	    res2.on('end', function(endReply) {

		if ( res2.statusCode == 200 ) {
		    var plantTS = JSON.parse( tsData ).outputs;

		    getAddress( plantMD, plantTS );
		}
	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};

//
// Retrieve plant meta-data
//
exports.getPlantMD = function( plantId ) {

	var options = {
	    host:'developer.nrel.gov',
      	    path:'/api/pvdaq/v3/sites.json?api_key='+pvdaqKey+'&system_id='+plantId,
	    //	    path:'/api/pvdaq/v3/sites.json?system_id='+plantId+'&api_key='+pvdaqKey,
	    headers:{
		'Authorization':pvdaqAuth
	    }
	};

	console.log( 'getPlantMD: '+options.host+' '+options.path /*+' '+options.headers.Authorization*/ );
	
	Http.get(options, function(res) {

	    console.log('getMD STATUS: '+res.statusCode);
	    if ( res.statusCode != 200 ) {
		logResult( plantId+' ... failed' );
	    }
	    
	    res.on('data', function(nrelReply) {

		if ( res.statusCode == 200 ) {
		    var plantMD = JSON.parse( nrelReply ).outputs[0];
		
		    var startDate = converter.getFirstYear( plantMD );
		
		    getPlantTS( plantMD, plantId, startDate, '12/01/2014' );
		}
	    });

	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};
