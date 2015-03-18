var Http = require('http');
var fs = require('fs');
var pvoutputKey = '4110292565c6df39d3817013d1e9c362e1ebbb8b';
var osparcHost = 'osparc4.elasticbeanstalk.com';
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');
var pvoutputPlant = require( './pvoutputPlant.js' );

//
// write result to file to keep track
//    
function logResult( text ) {
    fs.appendFileSync( 'pvoutput_imports.txt', text+'\r\n' );
}

//
// Retrieve plant meta-data
//
exports.getPlantMD = function( plantId ) {//1

    var getPlantOptions = {
	host:'pvoutput.org',
	path:'/service/r2/getsystem.jsp?key='+pvoutputKey+'&sid=35722'+'&sid1='+plantId,
    };

    Http.get( getPlantOptions, function(res) {//2
	    
	res.on('data', function(reply) {//3
	    console.log('getMD STATUS '+plantId+': '+res.statusCode);
	    if ( res.statusCode != 200 ) {
		logResult( plantId+' ... failed getMD' );
		return;
	    }

	    var plant = new pvoutputPlant();

	    try {  // getMD

		var csv = reply.toString();

		console.log( 'MD csv:'+csv );

		plant.setMetaData( csv );

		var lat = plant.getLat();
		var lon = plant.getLon();

		if ( lat < 26 || lat > 49 || lon < -124 || lon > -67 ) {
		    // not in the U.S.
		    console.log( plantId+' ('+lat+'/'+lon+'): '+plant.getName()+' is not in the U.S.' );
		    logResult( plantId+' ('+lat+'/'+lon+'): '+plant.getName()+' is not in the U.S.' );
		    return;
		}
		
		console.log( plantId+' ('+lat+'/'+lon+'): '+
			     plant.getName()+' BINGO: '+plant.getPostCode() );
		logResult( plantId+' ('+lat+'/'+lon+'): '+
			   plant.getName()+' BINGO: '+plant.getPostCode() );
	    
	    

//
// We have a plant in the U.S.  Get its timeseries data: getPlantTS
//		    
		
    var getTsOptions = {
	host:'pvoutput.org',
	path:'/service/r2/getoutput.jsp?key='+pvoutputKey+'&sid=35722'+'&sid1='+plantId+'&df=20070101&dt20150201&a=m',
    };

    console.log( 'getPlantTS: '+getTsOptions.host+' '+getTsOptions.path );

    Http.get(getTsOptions, function(res3 ) {//6
	    
	console.log('getTS STATUS '+plantId+': '+res3.statusCode );
	if ( res3.statusCode != 200 ) {
	    logResult( plantId+' ... failed getTS' );
	    return;
	}

	var tsData = '';

	res3.on('data', function(dataReply) {
	    tsData += dataReply;
	});
	
	res3.on('end', function(endReply) {//7
		
	    try {
		var csv = tsData.toString();
		console.log( 'TS csv:'+csv );
		plant.setTimeSeries( csv );

	    } catch ( err ) {  // try get TS
		console.log( plantId+' ERROR getting TS',err );
		logResult( plantId+' ERROR getting TS',err );
		return;
	    }

	    var mdXml = plant.toMDPed();
	    if ( mdXml == null ) {
		logResult( plantId+' ... failed parsing MD' );
		return;
	    }
	    console.log( "PlantPED:" );
	    console.log( mdXml );
	    var tsXml = plant.toTSPed();
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
	path:'/v1/plant/'+plant.getUuid()+'/timeseries',
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
	    }).on('error', function(e) {//5
	    console.log("ERROR: " + e.message);
	});


    } catch ( err ) {  // try get MD
	console.log( plantId+' ERROR getting MD',err );
	logResult( plantId+' ERROR getting MD', err );
	return;
    }

//
// getPlantMD closure
//
	    }).on('error', function(e) {//3
	    console.log("ERROR: " + e.message);
		});
	});//2


};



