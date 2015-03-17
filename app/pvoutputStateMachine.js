var Http = require('http');
var fs = require('fs');
var converter = require('./pvoutputConverter.js');

var osparcHost = 'osparc4.elasticbeanstalk.com';
//var osparcHost = 'osparctest-env3.elasticbeanstalk.com';
var pvdaqKey = 'dKI1nywdVEQTvB6Ra84sceIXTKFIaCxo8rxMFV2u';
var pvdaqAuth = 'Basic ' + new Buffer('dbergh:6cV867c2UjW').toString('base64');  // XXX make these user inputs
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');

//
// write result to file to keep track
//    
function logResult( text ) {
    fs.appendFileSync( 'pvdaq_imports.txt', text+'\r\n' );
}

//
// Retrieve plant meta-data
//
exports.getPlantMD = function( plantId ) {//1

    var getPlantOptions = {
	host:'developer.nrel.gov',
	path:'/api/pvdaq/v3/sites.json?api_key='+pvdaqKey+'&system_id='+plantId,
	headers:{
	    'Authorization':pvdaqAuth
	}
    };
    console.log( 'getPlantMD: '+getPlantOptions.host+' '+getPlantOptions.path );

    Http.get( getPlantOptions, function(res) {//2
	    
	res.on('data', function(nrelReply) {//3
	    console.log('getMD STATUS '+plantId+': '+res.statusCode);
	    if ( res.statusCode != 200 ) {
		logResult( plantId+' ... failed getMD' );
		return;
	    }
	    var plantMD = JSON.parse( nrelReply ).outputs[0];


//
// PVDAQ returned lat & long.  Get state and postal code from that.
//
    // some pvdaq db entries are wrong, their long is positive
    var long = new String( plantMD.site_longitude );
    if ( long.charAt(0) != '-' )
	plantMD.site_longitude = '-'+plantMD.site_longitude;

    var getAddrOptions = {
	'host':'maps.googleapis.com',
	'path':'/maps/api/geocode/json?latlng='+plantMD.site_latitude+','+plantMD.site_longitude,
	'headers': {
	    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	    'Accept-Language':'en-US,en;q=0.8,de;q=0.6'
	}
    };
    console.log( 'getAddres: '+getAddrOptions.host+' '+getAddrOptions.path );

    Http.get(getAddrOptions, function( res2 ) {//4
	    
	console.log('getAddress STATUS '+plantId+': '+res2.statusCode);
	if ( res2.statusCode != 200 ) {
	    logResult( plantId+' ... failed getAddr' );
	    return;
	}

	var replyData = '';
	res2.on('data', function(data) {
	    replyData += data;
        });
	res2.on('end', function(endReply) {//5

	try {
	    address = JSON.parse( replyData );
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
	    if ( state.length > 0 ) plantMD.state = state;
	    if ( zip.length > 0 ) plantMD.zip = zip;
	    var startDate = converter.getFirstYear( plantMD );

	    console.log( plantId+': state='+state+' zip='+zip+' startDate='+startDate );

	} catch( e ) {
	    console.log( plantId+' exception: '+e );
	    logResult( plantId+' ... failed parsing address' );
	    return;
	}



//
// getPlantTs
//		    
    var getTsOptions = {
	host:'developer.nrel.gov',
	path:'/api/pvdaq/v3/site_data.json?api_key='+pvdaqKey+'&system_id='+plantId+'&aggregate=monthly&start_date='+startDate+'&end_date=1/1/2015',
	headers:{
	    'Authorization':pvdaqAuth,
	}
    };

    console.log( 'getPlantTS: '+getTsOptions.host+' '+getTsOptions.path );

    Http.get(getTsOptions, function(res3 ) {//6
	    
	console.log('getTS STATUS '+plantId+': '+res3.statusCode );
	if ( res2.statusCode != 200 ) {
	    logResult( plantId+' ... failed getTS' );
	    return;
	}

	var tsData = '';

	res3.on('data', function(dataReply) {
	        tsData += dataReply;
	    });
	
	res3.on('end', function(endReply) {//7
		
	    var plantTS = JSON.parse( tsData ).outputs;
	    
	    var mdXml = converter.toMDPed( plantMD, plantTS );
	    console.log( "PlantPED:" );
	    console.log( mdXml );
	    if ( mdXml == null ) {
		logResult( plantId+' ... failed parsing MD' );
		return;
	    }
	    var tsXml = converter.toTSPed( plantMD, plantTS );
	    if ( tsXml == null ) {
		logResult( plantId+' ... failed parsing TS' );
		return;
	    }
	    console.log( "PlantTS:" );
	    console.log( tsXml );



//
// pokeMD
//
    var pokeMdOptions = {
	method:'POST',
	host:osparcHost,
	path:'/v1/plant',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };

    console.log( 'POST MD: '+pokeMdOptions.host+' '+pokeMdOptions.path );

    var req = Http.request(pokeMdOptions, function(res4) {//8
	    
	console.log('addPlant STATUS '+plantId+': '+res4.statusCode);
	if ( res4.statusCode != 200 ) {
            logResult( plantId+' ... failed posting MD' );
	    return;
	}

	res4.on('data', function(chunk) {//9


//
// pokeTS
//		
    var pokeTsOptions = {
	method:'POST',
	host:osparcHost,
	path:'/v1/plant/'+converter.getUuid( plantMD )+'/timeseries',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    
    console.log( 'POST TS: '+pokeTsOptions.host+' '+pokeTsOptions.path );

    var req = Http.request(pokeTsOptions, function( res5 ) {//10
	    
	console.log('addTS STATUS: '+res5.statusCode);
	if ( res5.statusCode != 200 ) {
	    logResult( plantId+' ... failed posting TS' );
	    return;
	}

	res5.on('data', function(chunk) {
	    logResult( plantId+' ... succeeded' );
	    return;
	});

//
// pokeTS closure
// 	
	req.on('error', function(e) {
            logResult( plantId+' ... failed' );
	    return;
	    });
	});//10

    req.write( tsXml );
    req.end();

//
// pokeMD closure
//
	    });//9
	
	req.on('error', function(e) {
		console.log("ERROR: " + e.message);
	    });
	});//8
    
    req.write( mdXml );
    req.end();

    });//7

//
// getPlantTS closure
//		    
	}).on('error', function(e) {//6
	    console.log("ERROR: " + e.message);
	});
//
// getPlantTS closure
//		    
	    }).on('error', function(e) {//5
	    console.log("ERROR: " + e.message);
	});
//
// getAddress closure
//		    
	}).on('error', function(e) {//4
	    console.log("ERROR: " + e.message);
	});
//
// getPlantMD closure
//
	    }).on('error', function(e) {//3
	    console.log("ERROR: " + e.message);
		});
	});//2
};



