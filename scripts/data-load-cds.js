const data = require('../lib/data/file/bitfinex-cds')

/*
let bars = data.load('5m')
console.log('bars:', bars.length)
*/

let bars = data.load('1h')
console.log('bars:', bars)
