//const data = require('../lib/data/file/bitfinex-data')
const data = require('../lib/data/file/cex-data')

/*
let bars = data.load('5m')
console.log('bars:', bars.length)
*/

let bars = data.load('1m')
console.log('bars:', bars.slice(0,100))
