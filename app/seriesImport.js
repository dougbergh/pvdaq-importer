var sm = require('./stateMachine.js');

function async(item, callback) {
    sm.getPlantMD( item );
    setTimeout(function() { callback(); }, 2000);
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
