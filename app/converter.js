exports.toPed = function( pvdaqMD, actDate ) {

    var now = new Date();
    var ret = '<sunSpecPlantExtract t="'+now.toISOString()+'" seqId="1" lastSeqId="1" v="2">\r\n';
       ret += '  <plant id="'+pvdaqMD.name_public+'" locale="en-US" v="2">\r\n';
       ret += '    <name>'+pvdaqMD.name_public+'</name>\r\n';
       ret += '    <activationDate>'+actDate+'</activationDate>\r\n';    // comes from TS - first data point
       ret += '    <location>\r\n';
       ret += '      <latitude>'+pvdaqMD.site_latitude+'</latitude>\r\n';
       ret += '      <longitude>'+pvdaqMD.site_longitude+'</longitude>\r\n';
    //       ret += '      <stateProvince>'+'XXX'+'</stateProvince>\r\n';     // XXX
    //       ret += '      <postal>'+'XXX'+'</postal>\r\n';  // XXX
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

exports.getFirstYear = function( pvdaqMD ) {
    return '01/01/'+pvdaqMD.available_years[0];
}

exports.getFirstDate = function( pvdaqTS ) {

    var firstDatapointTime = new Date( pvdaqTS[1][0] );

    return firstDatapointTime.toDateString();
}
