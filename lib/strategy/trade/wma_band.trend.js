const config = require('config')
const moment = require('moment')

const WMA = require('./wma')


class WMA_Band_Strategy {

    constructor(conf = null) {

        this.exchange
        this.config

        this.prev = {}
        this.cur = {}

        this.ma_hi
        this.ma_lo
        this.ma_hi_up = false
        this.ma_lo_down = false

        this.moves_ma = []
        this.moves_level = []

        this.tail_body_ratio
        this.distance_to_ma

        this.lot

        this.bars_count = 0

        if (!conf)
            this.set_config( config.get('strategy.trend.wma_band') )
        else
            this.set_config( conf )
    }

    set_config(conf) {

        this.ma_hi = new WMA(conf.ma)
        this.ma_lo = new WMA(conf.ma)
        
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
        
        this.ma_hi.add_price(bar.high)
        this.ma_lo.add_price(bar.low)

        if (this.bars_count <= this.ma_hi.period) return

        
        // up -----------------------------

        if ( this.ma_hi_cross_up() ) {
            this.ma_hi_up = true
            this.ma_hi_down = false
        }
        
        if ( this.ma_hi_cross_down() ) {
            this.ma_hi_down = true
            this.ma_hi_up = false
        }
            


        if ( this.ma_hi_up ) {

                if ( this.up_1bar(this.ma_hi) || this.up_2bar(this.ma_hi) )

                this.moves_ma.push({
                    dir: 'buy',
                    start: {
                        time: bar.time,
                        price: bar.close
                    },
                    stop: {
                        time: null,
                        price: 0
                    },
                    bars: []
                })


                this.moves_ma[this.moves_ma.length-1].bars.push({
                    time: bar.time,
                    high: bar.high - this.ma_hi.cur,
                    low:  bar.low  - this.ma_hi.cur
                })
            
        }


        if ( this.ma_hi_cross_down() && this.ma_hi_up ) {

            let last = this.moves_up[this.moves_up.length-1]

            last.stop.time = bar.time
            last.stop.price = bar.close
            
            this.move_up = false
        }
        
    }


    process_tick(bar) {
        
        //this.trail_stop()
        // stop loss
    }


    trail_stop() {

    }


    above_ma_hi() {
        return this.cur.open > this.ma_hi.cur && this.cur.close > this.ma_hi.cur
    }

    below_ma_lo() {
        return this.cur.open < this.ma_lo.cur && this.cur.close < this.ma_lo.cur
    }
    
    
    ma_hi_cross_up() {
        // prev green bar crosses hi ma and cur bar above ma
        return this.prev.close > this.prev.open && 
            this.prev.open < this.ma_hi.prev && 
            this.prev.close > this.ma_hi.prev &&
            this.cur.open > this.ma_hi.cur && 
            this.cur.close > this.ma_hi.cur
    }

    ma_hi_cross_down() {
        // prev red bar crosses hi ma and cur bar below ma
        return this.prev.close < this.prev.open && 
            this.prev.open > this.ma_hi.prev && 
            this.prev.close < this.ma_hi.prev &&
            this.cur.open < this.ma_hi.cur && 
            this.cur.close < this.ma_hi.cur
    }

    ma_lo_cross_up() {
        // prev green bar crosses lo ma and cur bar above ma
        return this.prev.close > this.prev.open && 
            this.prev.open < this.ma_lo.prev && 
            this.prev.close > this.ma_lo.prev &&
            this.cur.open > this.ma_lo.cur && 
            this.cur.close > this.ma_lo.cur
    }

    ma_lo_cross_down() {
        // prev red bar crosses lo ma and cur bar below ma
        return this.prev.close < this.prev.open && 
            this.prev.open > this.ma_lo.prev && 
            this.prev.close < this.ma_lo.prev &&
            this.cur.open < this.ma_lo.cur && 
            this.cur.close < this.ma_lo.cur
    }    

    
    get_levels() {
        // get levels spanned by cur bar
    }


    analyze_levels() {
        // walk through bars and collect levels into list, analyze function of each level
    }


    up_1bar_level(level) {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low
        
        return bottom_tail > 10 && //this.tail_body_ratio * body &&
            bottom >= level && ( this.cur.low <= level || this.cur.low - level <= this.distance_to_ma )
    }

    up_2bar_level(level) {

        return this.prev.close < this.prev.open && this.cur.close > this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open >= level && /*( this.prev.close <= level || this.prev.close - level <= 250 ) &&*/
            this.cur.close >= level && ( this.cur.open <= level || this.cur.open - level <= this.distance_to_ma )
    }

    down_1bar_level(level) {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low

        return top_tail > 10 && //this.tail_body_ratio * body &&
            top <= level && ( this.cur.high >= level || level - this.cur.high <= this.distance_to_ma )
    }

    down_2bar_level(level) {

        return this.prev.close > this.prev.open && this.cur.close < this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open <= level && /*( this.prev.close >= level || level - this.prev.close <= 250 ) &&*/
            this.cur.close <= level && ( this.cur.open >= level || level - this.cur.open <= this.distance_to_ma )
    }


    up_1bar_ma(ma) {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low
        
        return bottom_tail > 10 && //this.tail_body_ratio * body &&
            bottom >= ma.cur && ( this.cur.low <= ma.cur || this.cur.low - ma.cur <= this.distance_to_ma )
    }

    up_2bar_ma(ma) {

        return this.prev.close < this.prev.open && this.cur.close > this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open >= ma.cur && /*( this.prev.close <= ma.cur || this.prev.close - ma.cur <= 250 ) &&*/
            this.cur.close >= ma.cur && ( this.cur.open <= ma.cur || this.cur.open - ma.cur <= this.distance_to_ma )
    }

    down_1bar_ma(ma) {
        let top = this.cur.close > this.cur.open ? this.cur.close : this.cur.open
        let bottom = this.cur.close > this.cur.open ? this.cur.open : this.cur.close
        let body = top - bottom
        let top_tail = this.cur.high - top
        let bottom_tail = bottom - this.cur.low

        return top_tail > 10 && //this.tail_body_ratio * body &&
            top <= ma.cur && ( this.cur.high >= ma.cur || ma.cur - this.cur.high <= this.distance_to_ma )
    }

    down_2bar_ma(ma) {

        return this.prev.close > this.prev.open && this.cur.close < this.cur.open && Math.abs(this.prev.close - this.cur.open) <= 20 &&
            this.prev.open <= ma.cur && /*( this.prev.close >= ma.cur || ma.cur - this.prev.close <= 250 ) &&*/
            this.cur.close <= ma.cur && ( this.cur.open >= ma.cur || ma.cur - this.cur.open <= this.distance_to_ma )
    }

    
}

module.exports = WMA_Band_Strategy