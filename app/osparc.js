var Http = require('http');
var osparcHost = 'osparc4.elasticbeanstalk.com';
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');

exports.poke = function( plantId, uuid, mdXml, tsXml ) {

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
	path:'/v1/plant/'+uuid+'/timeseries',
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

}