//
// Discover which plants have timeseries data by querying for site_data.  Any error indicates there is no data for the site
//
var Http = require('http');
var fs = require('fs');

var pvdaqKey = 'dKI1nywdVEQTvB6Ra84sceIXTKFIaCxo8rxMFV2u';
var pvdaqAuth = 'Basic ' + new Buffer('dbergh:6cV867c2UjW').toString('base64');  // XXX make these user inputs
var oSparcAuth = 'Basic ' + new Buffer('dp5@sunspec.org:dp51!').toString('base64');

//
// write result to file to keep track
//    
function logResult( text ) {
    fs.appendFileSync( 'pvdaq_ids.txt', text+'\r\n' );
}

//
// Retrieve plant historical energy
//
exports.getPlantTS = function( plantId, start, end ) {

	var options = {
	    host:'developer.nrel.gov',
	    path:'/api/pvdaq/v3/site_data.json?api_key='+pvdaqKey+'&system_id='+plantId+'&aggregate=monthly&start_date='+start+'&end_date='+end,
	    headers:{
		'Authorization':pvdaqAuth,
		'Connection':'close'  // make the 'end' event happen sooner
	    }
	};

	if ( (plantId % 100) == 0 )
	    console.log( 'getPlantTS: '+options.host+' '+plantId );

	Http.get(options, function(res2) {

	    if ( res2.statusCode != 200 ) {
		logResult( plantId+' ... failed http code '+res2.statusCode );
	    }

	    var tsData = '';

	    res2.on('data', function(dataReply) {
	        tsData += dataReply;
	    });

	    res2.on('end', function(endReply) {

		if ( res2.statusCode == 200 ) {

		    var reply = JSON.parse( tsData );

		    if ( reply.errors.length === 0 )
			logResult( reply.inputs.system_id+' ... SUCCEEDED' );
		    else
			logResult( reply.inputs.system_id+' ... failed '+reply.errors );
		}
	    });
	}).on('error', function(e) {
	    console.log("ERROR: " + e.message);
        });
};
