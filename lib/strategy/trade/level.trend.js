const config = require('config')
const moment = require('moment')

const WMA = require('./wma')


class Strategy {

    constructor(conf = null) {

        this.exchange
        this.config

        this.prev = {}
        this.cur = {}

        this.bars = []

        this.ma_hi
        this.ma_lo
        this.ma_hi_up = false
        this.ma_lo_down = false

        this.signals = []

        this.tail_body_ratio
        this.distance_to_ma

        this.lot

        this.bars_count = 0

        if (!conf)
            this.set_config( config.get('strategy.trend.level') )
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
        this.bars.push(bar)
        
        this.prev = this.cur
        this.cur = bar
        
        /*this.ma_hi.add_price(bar.high)
        this.ma_lo.add_price(bar.low)

        if (this.bars_count <= this.ma_hi.period) return*/

        let up_break_bar
        let up_break_bar_i
        let down_break_bar

        let window = this.bars.reverse().slice(0,20)

        window.forEach((b,i) => {

            if (b == this.cur) return
            
            if ( !up_break_bar && 
                this.down_tail_length(this.cur) > 25  && // support bar has lower tail
                b.close - b.open > 200 && // break bar is green
                this.inside_bar(this.cur.low, b) && // support bar fits into break bar
                window.slice(0,i).filter(bar => bar.low < this.cur.low).length == 0 // bars after break bar are above
            ) {
                up_break_bar = b
                up_break_bar_i = i
            }
            

            if ( up_break_bar && up_break_bar != b &&
                this.up_tail_length(b) > 25 && // resistance bar has upper tail
                this.inside_bar(b.high, up_break_bar) && // resistance bar fits into break bar
                window.slice(up_break_bar_i+1,i).filter(bar => bar.high > b.high).length == 0 && // bars before break bar are below
                ( this.cur.low <= b.high 
                    //|| (this.cur.low - b.high) < 0.25*(up_break_bar.close - up_break_bar.open)*/
                ) 
            ) {
                
                    this.signals.push({
                    type: 'up',
                    sup: this.cur.time,
                    break: up_break_bar.time,
                    res: b.time
                })

                up_break_bar = null
                return
            }

            
            /*if ( !down_break_bar && b.close < b.open && this.cur.high > b.close && this.cur.high < b.open ) {
                down_break_bar = b
            }

            if ( down_break_bar && down_break_bar != b &&
                 b.low < down_break_bar.open && b.low > down_break_bar.close && 
                (this.cur.high >= b.low 
                    //|| (b.low - this.cur.high) < 0.25*(down_break_bar.open - down_break_bar.close)
                ) 
            ) {
                
                    this.signals.push({
                    type: 'down',
                    res: this.cur.time,
                    break: down_break_bar.time,
                    sup: b.time
                })

                down_break_bar = null
                return
            }*/

        })
        
    }


    process_tick(bar) {
        
        //this.trail_stop()
        // stop loss
    }


    trail_stop() {

    }

    
    get_levels() {
        // get levels spanned by cur bar
    }


    analyze_levels() {
        // walk through bars and collect levels into list, analyze function of each level
    }


    up_tail_length(bar) {
        return bar.high - ( bar.close > bar.open ? bar.close : bar.open )
    }

    down_tail_length(bar) {
        return ( bar.close < bar.open ? bar.close : bar.open ) - bar.low
    }

    inside_bar(value, bar) {
        let lower = bar.open < bar.close ? bar.open : bar.close
        let upper = bar.open > bar.close ? bar.open : bar.close
        return value > lower && value < upper
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

module.exports = Strategy