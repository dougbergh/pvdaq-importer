var csv2array = require('csv2array');

module.exports = function pvoutputPlant() {

    var samples = new Array();
    var md;

    this.setMetaData = function( csv ) {
	this.md = csv2array( csv );
    }

    var name = 0;
    var dcRating = 1;
    var postCode = 2;
    var numPanels = 3;
    var panelPower = 4;
    var panelBrand = 5;
    var numInverters = 6;
    var inverterPower = 7;
    var inverterBrand = 8;
    var orientation = 9;
    var arrayTilt = 10;
    var shade = 11;
    var installDate = 12;
    var latitude = 13;
    var longitude = 14;

    this.getName = function() { return this.md[0][name]; }
    this.getUuid = function() { return this.md[0][name]+'-pvo'; }
    this.getDCRating = function() { return this.md[0][dcRating]; }
    this.getPostCode = function() { return this.md[0][postCode]; }
    this.getLat = function() { return this.md[0][latitude]; }
    this.getLon = function() { return this.md[0][longitude]; }
    this.getPostCode = function() { return this.md[0][postCode]; }
    this.getInstallDate = function() { 
	var dateStr = this.md[0][installDate];
	var year = dateStr.substring( 0,4 );
	var month = parseInt( dateStr.substring( 4,6 ) ) - 1;  // convert 1-12 to 0-11 
	var day = dateStr.substring( 6, 8 );
	return new Date( year, month, day );
    }
    this.getOrientation = function() { return this.md[0][orientation]; }
    this.getTilt = function() { return this.md[0][arrayTilt]; }
    this.toMDPed = function() {
	var now = new Date().toISOString();
	var ret = '<sunSpecPlantExtract t="'+now+'" seqId="1" lastSeqId="1" v="2">\r\n';
	ret += '  <plant id="'+this.getUuid()+'" locale="en-US" v="2">\r\n';
	ret += '    <name>'+this.getName()+'</name>\r\n';
	ret += '    <activationDate>'+this.getInstallDate().toISOString()+'</activationDate>\r\n';
	ret += '    <location>\r\n';
	ret += '      <latitude>'+this.getLat()+'</latitude>\r\n';
	ret += '      <longitude>'+this.getLon()+'</longitude>\r\n';
	//	ret += '      <stateProvince>'+pvdaqMD.state+'</stateProvince>\r\n';    XXX NEED TO ADD!
	ret += '      <postal>'+this.getPostCode()+'</postal>\r\n';
	ret += '    </location>\r\n';
	ret += '    <namePlate>\r\n';
	ret += '      <property id="installedDCCapacity" type="float">'+this.getDCRating()+'</property>\r\n';
	//       ret += '      <property id="derate" type="float">0.8646193</property>\r\n';
	//       ret += '      <property id="nominalPowerRating" type="float">912182</property>\r\n';
	ret += '    </namePlate>\r\n';
	/*
	  ret += '    <designElements>\r\n';
	  ret += '      <property id="plantType" type="string">Commercial</property>\r\n';
	  ret += '      <property id="weatherSource" type="string">CPR</property>\r\n';
	  ret += '    </designElements>\r\n';
	*/
	ret += '    <tag>PVOUTPUT</tag>\r\n';
	ret += '    <pvArray>\r\n';
	ret += '      <property id="dcRating" type="integer">'+this.getDCRating()+'</property>\r\n';
	//       ret += '      <property id="numModules" type="integer">4587</property>\r\n';
	ret += '      <property id="fixedTilt" type="integer">'+this.getTilt()+'</property>\r\n';
	ret += '      <property id="fixedAzimuth" type="integer">'+this.getOrientation()+'</property>\r\n';
	ret += '    </pvArray>\r\n';
	/*
	  ret += '    <participant type="Installer">\r\n';
	  ret += '      <property id="organization">SunPower Corporation, Systems (Richmond)</property>\r\n';
	  ret += '    </participant>\r\n';
	  ret += '    <participant type="Originator">\r\n';
	  ret += '      <property id="organization">SunPower Corporation, Systems (Richmond)</property>\r\n';
	  ret += '    </participant>\r\n';
	  ret += '    <participant type="Servicer-Data Custodian">\r\n';
	  ret += '      <property id="organization">National Semiconductor</property>\r\n';
	  ret += '    </participant>\r\n';
	  ret += '    <equipment type="inverter">\r\n';
	  ret += '      <property id="Mn" type="string">Xantrex Technology</property>\r\n';
	  ret += '      <property id="Md" type="string">GT250-480</property>\r\n';
	  ret += '      <property id="Num" type="integer">4</property>\r\n';
	  ret += '    </equipment>\r\n';
	  ret += '    <equipment type="module">\r\n';
	  ret += '      <property id="Mn" type="string">SunPower</property>\r\n';
	  ret += '      <property id="Md" type="string">SPR-230-WHT-U</property>\r\n';
	  ret += '      <property id="Num" type="integer">4587</property>\r\n';
	  ret += '    </equipment>\r\n';
	*/
	ret += '  </plant>\r\n';
	ret += '</sunSpecPlantExtract>\r\n';
	return ret;
    }

    var tsDate = 0;
    var tsOutputs = 1;  // # of days aggregated if monthly
    var tsEnergyGenerated = 2;
    var tsEfficiency = 3;
    var tsEnergyExported = 4;
    var tsEnergyUsed = 5;
    var tsPeakEnergyImport = 6;
    var tsOffPeakEnergyImport = 7;
    var tsShoulderEnergyImpor = 8;
    var tsHighShoulderEnergyImport = 9;

    //
    // The string we get from pvoutput is 'yyyymm'.  We need to save the 1st of the FOLLOWING
    // month so that it corresponds to the END of the pvoutput month
    //
    this.getSampleDate = function( sample ) {

	var year = sample[0][tsDate].substring( 0,4 );
	// note that while you'd think we should add 1 based on the above comment, we don't
	// because Date() interprets 0 as Jan, 1 as feb etc...so pvoutput has effectively 
	// incremented for us...
	var month = parseInt( sample[0][tsDate].substring( 4,6 ) );
	
	// note that Date has the sweet property of incrementing the year if the month is 13
	return new Date( year, month, 1 );
    }

    this.getSampleEnergy = function( sample ) {
	return sample[0][tsEnergyGenerated];
    }

    this.setTimeSeries = function( csv ) {
	// samples are separated by ';' each sample contains a comma-separated list of data points
	for ( prevIndex = 0, index = csv.indexOf( ';' ); 
	      index != -1; 
	      prevIndex = index+1, index = csv.indexOf( ';',prevIndex+1 ) ) {
	    var sample = csv2array( csv.substring( prevIndex, index ) );
	    samples.push( sample );
	}
    }

    this.getNextSample = function() {
	return samples.pop();
    }

    this.toTSPed = function() {
	var sample;
	var points = '';
	var start = new Date();
	var startSet = false;
	var end = new Date();
	while ( (sample = this.getNextSample()) != null ) {
	    var timestamp = this.getSampleDate( sample );
	    var energy = this.getSampleEnergy( sample );
	    
	    points += '  <sunSpecAggregatedData t="'+timestamp.toISOString()+'" interval="monthly">\r\n';
	    points += '    <plantMeasurements>\r\n';
	    points += '      <p id="WH" diff="'+energy+'"/>\r\n';
	    points += '    </plantMeasurements>\r\n';
	    points += '  </sunSpecAggregatedData>\r\n';

	    if ( startSet == false ) {
		start.setTime( timestamp.getTime() );
		startSet = true;
	    }
	    end.setTime( timestamp.getTime() );
	}
	
	var now = new Date().toISOString();
	console.log( end );
	
	var ret = '';
	ret += '<sunSpecPlantExtract t="'+now+'" periodStart="'+start.toISOString()+'" periodEnd="'+end.toISOString()+'" v="2">\r\n';
	ret += '  <plant id="'+this.getUuid()+'" locale="en-US" v="2"/>\r\n';
	ret += points;
	ret += '</sunSpecPlantExtract>';
	
	return ret;
    }
    return this;    // appease the js gods
}
