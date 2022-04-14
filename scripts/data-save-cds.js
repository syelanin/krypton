const data = require('../lib/data/file/bitfinex-cds')

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
    return data.save('15m')
})
