var sm = require('./stateMachine.js');
//var sm = require('./smdiscover.js');

function async(item, callback) {
    sm.getPlantMD( item );
    //    sm.getPlantTS( item, '1/1/2014', '1/01/2014' );
    setTimeout(function() { callback(); }, 4000);
}

function final(results) { console.log('Done', results); }

function series( items ) {
    var results = [];
    var item = items.shift();
    if(item) {
	async( item, function(result) {
		results.push(result);
		return series(items);
	    });
    } else {
	return final(results);
    }
}

exports.seriesImport = function( items ) {
    return series( items );
}
