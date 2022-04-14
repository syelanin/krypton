//const data = require('../lib/data/file/bitfinex-data')
const data = require('../lib/data/file/cex-data')

const moment = require('moment')

/*
Promise.resolve()
.then(() => {
    return data.save('15m', 960)
})
.then(() => {
    return data.save('1h', 240)
})
*/


Promise.resolve()
.then(() => {
    return data.save('1m')
})
.then(() => {
    return data.save('1h')
})
.then(() => {
    return data.save('1d')
})
