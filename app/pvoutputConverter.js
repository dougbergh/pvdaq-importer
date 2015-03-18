//
// these are the indices of the named parameter in the csv stream
//
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

exports.getName = function( attrs ) {
    return attrs[0][name];
}
exports.getPostCode = function( attrs ) {
    return attrs[0][postCode];
}
exports.getLat = function( attrs ) {
    return attrs[0][latitude];
}
exports.getLon = function( attrs ) {
    return attrs[0][longitude];
}














exports.getFirstYear = function( pvdaqMD ) {
    var year = pvdaqMD.available_years[0];
    if ( year == null || year.length == 0 )
	year = '2007'
    return '01/01/'+year;
}

exports.getUuid = function( pvdaqMD ) {
    return getUuidInternal( pvdaqMD );
}

function getUuidInternal( pvdaqMD ) {
    var ret = pvdaqMD.name_public.replace( /\s+/g, '_' );    // this'll be part of a URL; can't take spaces - so convert them to '_'
    return ret.replace( /#/g, '' );    // also can't take '#' - just remove
}

function getFirstDate( pvdaqTS ) {

    try {
	var firstPt = new Date( pvdaqTS[1][0] );
	var dateTime = firstPt.toISOString();
	return dateTime.substring(0,10);  // lop off the time
    } catch ( e ) {
	return null;
    }
}

exports.toMDPed = function( pvdaqMD, pvdaqTS ) {

    var actDate = getFirstDate( pvdaqTS );
    var now = new Date();
    var uuid = getUuidInternal( pvdaqMD );

    var ret = '<sunSpecPlantExtract t="'+now.toISOString()+'" seqId="1" lastSeqId="1" v="2">\r\n';
       ret += '  <plant id="'+uuid+'" locale="en-US" v="2">\r\n';
       ret += '    <name>'+pvdaqMD.name_public+'</name>\r\n';
       ret += '    <activationDate>'+actDate+'</activationDate>\r\n';    // comes from TS - first data point
       ret += '    <location>\r\n';
       ret += '      <latitude>'+pvdaqMD.site_latitude+'</latitude>\r\n';
       ret += '      <longitude>'+pvdaqMD.site_longitude+'</longitude>\r\n';
       ret += '      <stateProvince>'+pvdaqMD.state+'</stateProvince>\r\n';
       ret += '      <postal>'+pvdaqMD.zip+'</postal>\r\n';
       ret += '    </location>\r\n';
       ret += '    <namePlate>\r\n';
       ret += '      <property id="installedDCCapacity" type="float">'+pvdaqMD.site_power+'</property>\r\n';
       //       ret += '      <property id="derate" type="float">0.8646193</property>\r\n';
       //       ret += '      <property id="nominalPowerRating" type="float">912182</property>\r\n';
       ret += '    </namePlate>\r\n';
    /*
    ret += '    <designElements>\r\n';
    ret += '      <property id="plantType" type="string">Commercial</property>\r\n';
    ret += '      <property id="weatherSource" type="string">CPR</property>\r\n';
    ret += '    </designElements>\r\n';
    */
       ret += '    <tag>PVDAQ</tag>\r\n';
       ret += '    <pvArray>\r\n';
       ret += '      <property id="dcRating" type="integer">'+pvdaqMD.site_power+'</property>\r\n';
       //       ret += '      <property id="numModules" type="integer">4587</property>\r\n';
       ret += '      <property id="fixedTilt" type="integer">'+pvdaqMD.site_tilt+'</property>\r\n';
       ret += '      <property id="fixedAzimuth" type="integer">'+pvdaqMD.site_azimuth+'</property>\r\n';
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

exports.toTSPed = function( pvdaqMD,pvdaqTS ) {

    try {

    var start = new Date( pvdaqTS[1][0] ).toISOString();  // this will throw if there's no time series data
    var i = 0;
    var point;
    var points = '';
    while ( (point = pvdaqTS[++i]) != null ) {
    
	var timestamp = new Date( point[0] ).toISOString();

	if ( point[7] == null ) continue;
	var whdc = parseInt( point[7] ) * 1000;    // energy_from_array

	// the thinking here is this:
	//   if total_energy_output is present, it's probably the AC production of the PV array
	//   (and energy_to_grid contains some other factor in addition and is therefore inappropriate)
	//   if, however, total_energy_output is not present but energy_to_grid is, then the odds are 
	//   that energy_to_grid is the output of the PV array.
	//   If neither are present, then take the energy_from_array (which I would assume is DC from
	//   the panels) to be the AC from the grid...because it's all we have, and it's better than 
	//   nothing.
	var whq;
	if ( point[17] != null )
	    whq = parseInt( point[17] ) * 1000;    // total_energy_output
	else if ( point[9] != null )
	    whq = parseInt( point[9] ) * 1000;     // energy_to_grid
	else if ( point[7] != null )
	    whq = parseInt( point[9] ) * 1000;     // energy_from_array
	else continue;    // skip this sample

	points += '  <sunSpecAggregatedData t="'+timestamp+'" interval="monthly">\r\n';
	points += '    <plantMeasurements>\r\n';
	points += '      <p id="WH" diff="'+whq+'"/>\r\n';
	points += '    </plantMeasurements>\r\n';
	points += '    <pvArrayMeasurements pvArrayId="1">\r\n';
	points += '      <p id="WHDC" diff="'+whdc+'"/>\r\n';
	points += '    </pvArrayMeasurements>\r\n';
	points += '  </sunSpecAggregatedData>\r\n';
    }

    var now = new Date().toISOString();
    var uuid = getUuidInternal( pvdaqMD );
    var end = new Date( pvdaqTS[i-1][0] ).toISOString();  // note: uses 'i', the index of the last+1 sample

    var ret = '';
    ret += '<sunSpecPlantExtract t="'+now+'" periodStart="'+start+'" periodEnd="'+end+'" v="2">\r\n';
    ret += '  <plant id="'+uuid+'" locale="en-US" v="2"/>\r\n';
    ret += points;
    ret += '</sunSpecPlantExtract>';

    return ret;

    } catch (e) {
	return null;
    }
}

