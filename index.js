const b45 = require('base45-js');
const dateformat = require('dateformat');
const cbor = require('cbor');
const zlib = require('zlib');
const util = require('util');
const inflate = util.promisify(zlib.inflate);

// valuesets
const countries = require('./country-codes.json')['valueSetValues']
const vaxDiseases = require('./vax-diseases.json')['valueSetValues']
const vaxManufacturers = require('./vax-manf.json')['valueSetValues']
const vaxNames = require('./vax-names.json')['valueSetValues']
const vaxTypes = require('./vax-snomedtypes.json')['valueSetValues']
const testManufacturers = require('./test-manf.json')['valueSetValues']
const testTypes = require('./test-types.json')['valueSetValues']
const testResults = require('./test-result.json')['valueSetValues']

async function decode(qr) {
    if (qr.indexOf("HC1:") != 0)
        throw new Error("Not an EU Digital COVID Certificate")
    let d = b45.decode(qr.substring(4));
    d = await inflate(d);
    d = await cbor.decodeFirst(d);
    let [p, u, data, signers] = d.value;
    d = await cbor.decodeFirst(data);
    let issuer = d.get(1);
    let iat = new Date(d.get(6) * 1000); // issued at
    let exp = new Date(d.get(4) * 1000); // expiry
    d = d.get(-260).get(1)
    let type = null;
    if (d.hasOwnProperty("v")) type = "v"; // vaccinated
    else if (d.hasOwnProperty("t")) type = "t"; // tested
    else if (d.hasOwnProperty("r")) type = "r"; // recovered
    console.log(`EU Digital COVID Certificate v${d.ver}`);
    console.log(`Issued by ${countries[issuer].display} at ${dateformat(iat, "yyyy-mm-dd HH:MM:ss")}, expires ${dateformat(exp, "yyyy-mm-dd HH:MM:ss")}`);
    console.log(`Issued to ${d.nam.gn} ${d.nam.fn} (${d.nam.fnt}<<${d.nam.gnt}), born ${d.dob}`);
    switch (type) {
        case 'v':
            let v = d.v[0];
            console.log("VACCINATED");
            console.log(`Vaccinated on ${v.dt} by ${countries[v.co].display} with dose ${v.dn}/${v.sd} of ${vaxManufacturers[v.ma].display} ${vaxNames[v.mp].display} (${vaxTypes[v.vp].display}) targeting ${vaxDiseases[v.tg].display}`);
            console.log(`Certificate issued by ${v.is} with ID ${v.ci}`);
            break;
        case 't':
            let t = d.t[0];
            console.log("TESTED");
            console.log(`Sample collected at ${dateformat(new Date(t.sc), "yyyy-mm-dd HH:MM:ss")} by ${t.tc} in ${countries[t.co].display} with test ${t.hasOwnProperty("ma") ? testManufacturers[t.ma].display + "(" + testTypes[t.tt].display + ")" : testTypes[t.tt].display} targeting ${vaxDiseases[t.tg].display}`);
            console.log(t.hasOwnProperty("dr") ? `Result: ${testResults[t.tr].display} at ${dateformat(new Date(t.dr), "yyyy-mm-dd HH:MM:ss")}` : `Result: ${testResults[t.tr].display}`);
            console.log(`Certificate issued by ${t.is} with ID ${t.ci}`);
            break;
        case 'r':
            let r = d.r[0];
            console.log("RECOVERED");
            console.log(`Recovered from ${vaxDiseases[r.tg].display}, date of first positive test ${dateformat(new Date(r.fr), "yyyy-mm-dd HH:MM:ss")} in ${countries[r.co].display}`)
            console.log(`Certificate valid from ${r.df} until ${r.du}`)
            console.log(`Certificate issued by ${r.is} with ID ${r.ci}`);
            break;
        default:
            console.log("No valid certificate types found!");
            break;
    }
}
module.exports = { decode };