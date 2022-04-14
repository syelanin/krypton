const config = require('config')
const moment = require('moment')

const Exchange = require('./exchange')
//const Bitfinex = require('./bitfinex')
const bitfinex_data = require('../data/file/bitfinex-data')

const eventEmitter = require('events')


class Emulator_History extends Exchange {

    constructor() {
        super('emulator')

        this.events = new eventEmitter()
        //this.bitfinex = new Bitfinex()

        this.bars_5m = bitfinex_data.load('5m')
        this.bars_1m = bitfinex_data.load('1m')

        this.bar_timer
        this.tick_timer

        this.bar_interval = 5
        this.tick_interval = 1
    }


    on(event, handler) {
        if ( ['bar','tick'].includes(event) )
            this.events.on(event, handler)
    }


    init() {
        const _this = this

        this.bar_timer = setInterval( function() {
            let next = _this.bars_5m.values().next()
            if (next) {
                _this.events.emit('bar', next.value)
            }
            else {
                clearInterval(_this.bar_timer)
            }
        }, _this.bar_interval)


        this.bitfinex.candles('btcusd', '5m', 500)
        .then( data => {
            
            this.candles = data
            const _this = this
            
            let i = 0
            this.data_timer = setInterval( function() {
                let next = data.values().next()
                if (next) {
                    _this.events.emit('bar', next.value)
                }
                else {
                    clearInterval(_this.data_timer)
                }
            }, 1)

        })
        .then( () => {
            
            if (live) {

                const _this = this

                this.live_timer = setInterval( function () {
                    
                    let time = new Date()

                    Promise.resolve()
                    .then(() => {
                        if ( time.getSeconds() == 10 ) {
                            
                            let res = {}
                            return Promise.resolve()
                                .then(() => {
                                    return _this.bitfinex.candles('btcusd', '1m', 1)
                                        .then( bar => {
                                            res.bar = bar
                                        })
                                })
                                .then(() => {
                                    return _this.bitfinex.wallets()
                                        .then( wallets => {
                                            res.wallets = wallets
                                        })
                                })
                                .then(() => {
                                    _this.events.emit('bar:1m', res)
                                })
                            
                        }
                    })
                    .then(() => {
                        if ( time.getMinutes() % 5 == 0 && time.getSeconds() == 10 ) {
                            return _this.bitfinex.candles('btcusd', '5m', 1)
                            .then( bar => {
                                _this.events.emit('bar:5m', bar[0])
                            })
                        }
                    })

                }, 1000)

            }

        })
        
    }


    new_order() {

    }

    orders() {

    }

    balance() {

    }


}

module.exports = Emulator