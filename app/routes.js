var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
var Http = require('http');

module.exports = function(app) {

    // api ---------------------------------------------------------------------

    // get all
    app.get('/api/import', function(req, res) {
	res.json('hi mom, thanks for the GET!'); // return all records in JSON format
    });

    // Create a testrun database record, and send back all testruns after creation
    app.post('/api/import', function(req, res) {

	console.log("got POST: "+req.body.startSystemId+' '+req.body.numSystemIds);

	/*
	Http.get("http://localhost:8083/device?ipaddr="+req.body.deviceAddr, function(res2) {

	    res2.on("data", function(chunk) {

		console.log("got reply to POST: " + res2.status);

		if ( res2.status != 'SUCCESS' )
		    res.json(res2);
		else
		    res.json(res2);
        });

	}).on('error', function(e) {
	    console.log("got error: " + e.message);
        });
	*/

	res.json('HI MOM, you POSTED');
    });

    // application -------------------------------------------------------------
    app.get('*', function(req, res) {
	console.log("* got req:" + req.url);
	// load the single view file (angular will handle the page changes on the front-end)
        res.sendfile('./public/index.html'); 
    });

};



