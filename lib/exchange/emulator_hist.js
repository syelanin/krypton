const config = require('config')
const moment = require('moment')

//const Bitfinex = require('./bitfinex')
//const exchange_data = require('../data/file/bitfinex-data')
//const exchange_data = require('../data/file/cex-data')
const exchange_data = require('../data/file/bitfinex-cds')

const eventEmitter = require('events')


class Exchange_Emulator_History {

    constructor(conf = null) {

        this.events = new eventEmitter()
        //this.bitfinex = new Bitfinex()
        
        this.main = {
            timer: null,
            timeframe: null,
            interval: null,
            bars: []
        }

        this.tick = {
            timer: null,
            timeframe: null,
            interval: null,
            bars: []
        }

        this.balances

        this.orders = []
        
        if (!conf)
            this.set_config( config.get('exchange.emulator.history') )
        else
            this.set_config( conf )
    }

    
    set_config(conf) {

        this.main = Object.assign({}, conf.main)
        this.tick = Object.assign({}, conf.tick)

        this.main.bars = exchange_data.load(conf.main.timeframe)
        this.tick.bars = exchange_data.load(conf.tick.timeframe)

        this.balances = Object.assign({}, conf.balances)
    }


    on(event, handler) {
        if ( ['start','stop','main','tick'].includes(event) )
            this.events.on(event, handler)
    }

    clear(event) {
        this.events.removeAllListeners(event)
    }


    start() {

        if (this.main.timer)
            clearInterval(_this.main.timer)

        if (this.tick.timer)
            clearInterval(_this.tick.timer)


        let main_bars = this.main.bars
        let main_i = 0

        this.main.timer = setInterval( () => {
            
            if ( main_i < main_bars.length ) {
                this.events.emit('main', main_bars[main_i])
                this.on_main(main_bars[main_i])
                main_i += 1
            }
            else {
                this.stop()
            }

        }, this.main.interval)


        let tick_bars = this.tick.bars
        let tick_i = 0

        this.tick.timer = setInterval( () => {
            
            if ( tick_i < tick_bars.length ) {
                this.events.emit('tick', tick_bars[tick_i])
                this.on_tick(tick_bars[tick_i])
                tick_i += 1
            }
            else {
                clearInterval(this.tick.timer)
            }

        }, this.tick.interval)


        this.events.emit('start')
        
    }


    stop() {
        clearInterval(this.main.timer)
        clearInterval(this.tick.timer)
        this.events.emit('stop')
    }


    can_buy(amount, price) {
        return this.balances.usd - amount*price > 0 ? true : false
    }

    can_sell(amount) {
        return this.balances.btc > amount ? true : false
    }


    new_order(order) {
        
        let order_id = this.orders.length + 1
        order.id = order_id

        this.orders.push(order)

        if (order.type == 'buy') {
            this.balances.btc += order.amount
            this.balances.usd -= order.amount * order.price
        }

        if (order.type == 'sell') {
            this.balances.btc -= order.amount
            this.balances.usd += order.amount * order.price
        }

        console.log('order:', order)
        console.log('balances:', 'btc:', this.round(this.balances.btc), 'usd:', this.round(this.balances.usd))

        return order_id
    }

    round(val) {
        return Math.round(val*100)/100
    }


    get last_order() {
        return this.orders.length ? this.orders[this.orders.length - 1] : {}
    }


    on_main(bar) {
        
    }

    on_tick(bar) {
        // emulate limit orders fulfiled by exchange
        // check usd & btc balance
    }

}

module.exports = Exchange_Emulator_History