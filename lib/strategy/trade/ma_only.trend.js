const config = require('config')
const moment = require('moment')

const WMA = require('./wma')


class MA_Only_Strategy {

    constructor(conf = null) {

        this.exchange
        this.config

        this.prev = {}
        this.cur = {}

        this.ma1
        this.ma2
        this.ma3

        this.tail_body_ratio
        this.distance_to_ma

        this.lot

        this.bars_count = 0

        if (!conf)
            this.set_config( config.get('strategy.trend.ma_only') )
        else
            this.set_config( conf )
    }

    set_config(conf) {

        this.ma1 = new WMA(conf.ma1)
        this.ma2 = new WMA(conf.ma2)
        this.ma3 = new WMA(conf.ma3)
        
        this.tail_body_ratio = conf.tail_body_ratio
        this.distance_to_ma = conf.distance_to_ma

        this.lot = conf.lot
    }

    set_exchange(exchange) {
        
        this.exchange = exchange

        this.exchange.clear('main')
        this.exchange.clear('tick')

        this.exchange.on('main', bar => {
            this.process_main(bar)
        })
        this.exchange.on('tick', bar => {
            this.process_tick(bar)
        })
    }
    

    process_main(bar) {
        
        this.bars_count += 1
        
        this.prev = this.cur
        this.cur = bar
        
        this.ma1.add_price(bar.close)
        this.ma2.add_price(bar.close)
        this.ma3.add_price(bar.close)

        if (this.bars_count <= this.ma1.period) return

        console.log('main:', bar.time, 'ma1.prev:', this.ma1.prev, 'ma1.cur:', this.ma1.cur)
        
        // buy btc

        if (this.exchange.last_order.type != 'buy' && this.exchange.can_buy(0.01, bar.close) && this.up_1bar()) {
            
            this.exchange.new_order({
                type: 'buy',
                amount: this.lot,
                price: bar.close,
                time: bar.time,
                signal: 'up1_bar'
            })

        }

        if (this.exchange.last_order.type != 'buy' && this.exchange.can_buy(0.01, bar.close) && this.up_2bar()) {
            
            this.exchange.new_order({
                type: 'buy',
                amount: this.lot,
                price: bar.close,
                time: bar.time,
                signal: 'up2_bar'
            })

        }

        // sell btc

        if (this.exchange.last_order.type != 'sell' && this.exchange.can_sell(0.01) && this.down_1bar()) {
            
            this.exchange.new_order({
                type: 'sell',
                amount: this.lot,
                price: bar.close,
                time: bar.time,
                signal: 'down_1bar'
            })

        }

        if (this.exchange.last_order.type != 'sell' && this.exchange.can_sell(0.01) && this.down_2bar()) {
            
            this.exchange.new_order({
                type: 'sell',
                amount: this.lot,
                price: bar.close,
                time: bar.time,
                signal: 'down_2bar'
            })

        }
        
    }


    process_tick(bar) {
        
        //this.trail_stop()
    }


    trail_stop() {

    }


    up_1bar() {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low
        
        return bottom_tail > this.tail_body_ratio * body &&
            bottom >= this.ma1.cur && ( this.cur.low <= this.ma1.cur || this.cur.low - this.ma1.cur <= this.distance_to_ma )
    }

    up_2bar() {

        return this.prev.close < this.prev.open && this.cur.close > this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open >= this.ma1.cur && /*( this.prev.close <= this.ma1.cur || this.prev.close - this.ma1.cur <= 250 ) &&*/
            this.cur.close >= this.ma1.cur && ( this.cur.open <= this.ma1.cur || this.cur.open - this.ma1.cur <= this.distance_to_ma )
    }

    down_1bar() {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low

        return top_tail > this.tail_body_ratio * body &&
            top <= this.ma1.cur && ( this.cur.high >= this.ma1.cur || this.ma1.cur - this.cur.high <= this.distance_to_ma )
    }

    down_2bar() {

        return this.prev.close > this.prev.open && this.cur.close < this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open <= this.ma1.cur && /*( this.prev.close >= this.ma1.cur || this.ma1.cur - this.prev.close <= 250 ) &&*/
            this.cur.close <= this.ma1.cur && ( this.cur.open >= this.ma1.cur || this.ma1.cur - this.cur.open <= this.distance_to_ma )
    }
    
}

module.exports = MA_Only_Strategy