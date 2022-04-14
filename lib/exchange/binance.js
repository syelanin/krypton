const config = require('config')
const crypto = require('crypto')
const request = require('superagent')
const moment = require('moment')

const Exchange = require('./exchange')


class Binance extends Exchange {

    constructor() {
        super('binance')
    }

}

module.exports = Binance