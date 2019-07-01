const fs = require('fs');

let rawdata = fs.readFileSync('package.json');
let obj = JSON.parse(rawdata);

let v = obj.version.split('.');
v[2] = parseInt(v[2]) + 1;

obj.version = v.join('.').toString();

fs.writeFileSync('package.json', JSON.stringify(obj, null, 2));