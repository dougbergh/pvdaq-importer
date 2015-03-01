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
	    if ( res.statusCode != 200 )
		return;
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
	if ( res2.statusCode != 200 )
		return;

	var replyData = '';
	res2.on('data', function(data) {
	    replyData += data;
        });
	res2.on('end', function(endReply) {//5
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


//
// getPlantTs
//		    
    var options = {
	host:'developer.nrel.gov',
	path:'/api/pvdaq/v3/site_data.json?api_key='+pvdaqKey+'&system_id='+plantId+'&aggregate=monthly&start_date='+startDate+'&end_date=1/1/2015',
	headers:{
	    'Authorization':pvdaqAuth,
	    'Connection':'close'  // make the 'end' event happen sooner
	}
    };

    Http.get(options, function(res3 ) {//6
	    
	console.log('getTS STATUS '+plantId+': '+res3.statusCode );
	if ( res2.statusCode != 200 ) {
	    logResult( plantId+' ... succeeded' );
	    return;
	}

	var tsData = '';

	res3.on('data', function(dataReply) {
	        tsData += dataReply;
	    });
	
	res3.on('end', function(endReply) {//7
		
	    var plantTS = JSON.parse( tsData ).outputs;
		
	    var mdXml = converter.toMDPed( plantMD, plantTS );
	    var tsXml = converter.toTSPed( plantMD, plantTS );
	    

//
// pokeMD
//
    var options = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    var req = Http.request(options, function(res4) {//8
	    
	console.log('addPlant STATUS '+plantId+': '+res4.statusCode);
	if ( res4.statusCode != 200 ) {
            logResult( plantId+' ... failed' );
	}

	res4.on('data', function(chunk) {//9


//
// pokeTS
//		
    var options = {
	method:'POST',
	host:'osparctest-env3.elasticbeanstalk.com',
	path:'/v1/plant/'+plantId+'/timeseries',
	headers:{
	    'Authorization':oSparcAuth,
	    'Content-type':'text/xml'
	}
    };
    
    var req = Http.request(options, function( res5 ) {//10
	    
	console.log('addTS STATUS: '+res5.statusCode);
	if ( res5.statusCode != 200 ) {
	    logResult( plantId+' ... succeeded' );
	    return;
	}

	res5.on('data', function(chunk) {
	    logResult( plantId+' ... succeeded' );
	});

//
// pokeTS closure
// 	
	req.on('error', function(e) {
	    console.log("ERROR on "+plantId+":" + e.message);
            logResult( plantId+' ... failed' );
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



