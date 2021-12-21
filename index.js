const b45 = require('base45-js');
const cbor = require('cbor');
const zlib = require('zlib');
const util = require('util');
const inflate = util.promisify(zlib.inflate);

// valuesets
const countries = require('./valuesets/country-codes.json')['valueSetValues']
const vaxDiseases = require('./valuesets/vax-diseases.json')['valueSetValues']
const vaxManufacturers = require('./valuesets/vax-manf.json')['valueSetValues']
const vaxNames = require('./valuesets/vax-names.json')['valueSetValues']
const vaxTypes = require('./valuesets/vax-snomedtypes.json')['valueSetValues']
const testManufacturers = require('./valuesets/test-manf.json')['valueSetValues']
const testTypes = require('./valuesets/test-types.json')['valueSetValues']
const testResults = require('./valuesets/test-result.json')['valueSetValues']

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
    let decoded = {
        v: d.ver,
        iss: countries.hasOwnProperty(issuer) ? countries[issuer].display : issuer,
        iat,
        exp,
        sub: {...d.nam, dob: d.dob }
    };
    switch (type) {
        case 'v':
            let v = d.v[0];
            decoded.id = v.ci;
            decoded.v = {
                ...v,
                decoded: {
                    ...v,
                    co: countries[v.co].display,
                    tg: vaxDiseases[v.tg].display,
                    ma: vaxManufacturers[v.ma].display,
                    mp: vaxNames[v.mp].display,
                    vp: vaxTypes[v.vp].display,
                }
            }
            break;
        case 't':
            let t = d.t[0];
            decoded.id = t.ci;
            decoded.t = {
                ...t,
                decoded: {
                    ...t,
                    co: countries[t.co].display,
                    tg: vaxDiseases[t.tg].display,
                    ma: t.hasOwnProperty("ma") ? testManufacturers.hasOwnProperty(t.ma) ? testManufacturers[t.ma].display : t.ma : undefined,
                    tt: testTypes[t.tt].display,
                    tr: testResults[t.tr].display,
                }
            }
            break;
        case 'r':
            let r = d.r[0];
            decoded.id = r.ci;
            decoded.r = {
                ...r,
                decoded: {
                    ...r,
                    co: countries[r.co].display,
                    tg: vaxDiseases[r.tg].display,
                }
            }
            break;
        default:
            break;
    }
    return decoded;
}
module.exports = { decode };