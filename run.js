const dateformat = require('dateformat');
let { decode } = require('./index');
let decodeStdIn = async() => {
    let d = await decode(process.argv[2]);
    console.log(d);
    console.log(`EU Digital COVID Certificate v${d.ver}`);
    console.log(`Issued by ${d.iss} at ${dateformat(d.iat, "yyyy-mm-dd HH:MM:ss")}, expires ${dateformat(d.exp, "yyyy-mm-dd HH:MM:ss")}`);
    console.log(`Issued to ${d.sub.gn} ${d.sub.fn} (${d.sub.fnt}<<${d.sub.gnt}), born ${d.sub.dob}`);
    let type = null;
    if (d.hasOwnProperty("v")) type = "v"; // vaccinated
    else if (d.hasOwnProperty("t")) type = "t"; // tested
    else if (d.hasOwnProperty("r")) type = "r"; // recovered
    switch (type) {
        case 'v':
            let v = d.v.decoded;
            console.log("VACCINATED");
            console.log(`Vaccinated on ${v.dt} by ${v.co} with dose ${v.dn}/${v.sd} of ${v.ma} ${v.mp} (${v.vp}) targeting ${v.tg}`);
            console.log(`Certificate issued by ${v.is} with ID ${v.ci}`);
            break;
        case 't':
            let t = d.t.decoded;
            console.log("TESTED");
            console.log(`Sample collected at ${dateformat(new Date(t.sc), "yyyy-mm-dd HH:MM:ss")} by ${t.tc} in ${t.co} with test ${t.hasOwnProperty("ma") ? t.ma + "(" + t.tt + ")" : t.tt} targeting ${t.tg}`);
            console.log(t.hasOwnProperty("dr") ? `Result: ${t.tr} at ${dateformat(new Date(t.dr), "yyyy-mm-dd HH:MM:ss")}` : `Result: ${t.tr}`);
            console.log(`Certificate issued by ${t.is} with ID ${t.ci}`);
            break;
        case 'r':
            let r = d.r.decoded;
            console.log("RECOVERED");
            console.log(`Recovered from ${r.tg}, date of first positive test ${dateformat(new Date(r.fr), "yyyy-mm-dd HH:MM:ss")} in ${r.co}`)
            console.log(`Certificate valid from ${r.df} until ${r.du}`)
            console.log(`Certificate issued by ${r.is} with ID ${r.ci}`);
            break;
        default:
            console.log("No valid certificate types found!");
            break;
    }
}
decodeStdIn()