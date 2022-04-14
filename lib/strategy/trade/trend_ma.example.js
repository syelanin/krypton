const fs = require('fs')
const path = require('path')
const moment = require('moment')

const file_base = 'Data Bitfinex BTCUSD'
//const file_base = 'bitfinex btcusd hist'
const timeframe = '15t'
const span = '1mo'
const filename = `${file_base} ${timeframe} ${span} ohlc`

console.log(`File: ${filename}`)

let csv = fs.readFileSync(path.join(__dirname, `${filename}.csv`), {encoding:'utf8'})
console.log(`Length: ${csv.length}`)

let bars = csv.split('\r\n').slice(1).map(line => {
        let cols = line.split(',')
        return {
            time: moment(cols[0]),
            open: +cols[1],
            high: +cols[2],
            low: +cols[3],
            close: +cols[4],
            volume: +cols[5]
        }
    })
        
console.log(`Loaded bars: ${bars.length}`)

// ==================================================

let params = {
    ma1: 25,
    ma2: 50,
    ma3: 100,
    ma4: 150,
    ma5: 200,

    dist_to_ma: 500,
    tail_size: 0.25,

    // stop loss, take profit
    sl: 25,
    tp: 100,
    ts_trg: 50,
    ts: 25,

    // trailing stop
    use_ts: true,
    ts_type: 'zero',

    allow_buy: true,
    allow_sell: true,
    signal_1bar: true,
    signal_2bar: true,

    save_trades: true
}

// -------------------------------------------------------


function generate_params() {
    let p = []
    
    /* 1h
    let sl_set = [175,200,225]
    let tp_set = [900,950,1000]
    let dist_ma_set = [500,550]
    let tail_set = [0.15,0.2,0.25]
    let use_ts_set = [false, true]
    let ts_type_set = ['zero']
    let ts_trg_set = [250,300,350]
    let ts_set = [5,25,50,100,150,200]*/

    let sl_set = [30,40,50]
    let tp_set = [500,550,600,700]
    let dist_ma_set = [450,500,550,600]
    let tail_set = [0.3,0.4,0.5]
    let use_ts_set = [false, true]
    let ts_type_set = ['zero','trail']
    let ts_trg_set = [100,150,200,250]
    let ts_set = [100,150,200,250]

    sl_set.forEach ( sl => {
        tp_set.forEach ( tp => {
            dist_ma_set.forEach( dist_ma => {
                tail_set.forEach( tail => {
                    
                    use_ts_set.forEach ( use_ts => {
                        if (use_ts) {
                            ts_type_set.forEach ( ts_type => {
                                ts_trg_set.forEach ( ts_trg => {
                                    ts_set.forEach ( ts => {
                                        if (tp > sl && ts_trg > ts)
                                        p.push( Object.assign({}, params, {sl: sl,  tp: tp, use_ts: use_ts, ts_type: ts_type, ts_trg: ts_trg,  ts: ts, dist_to_ma: dist_ma, tail_size: tail}) ) 
                                    })
                                })
                            })
                        }
                        else {
                            p.push( Object.assign({}, params, {sl: sl,  tp: tp, use_ts: use_ts, dist_to_ma: dist_ma, tail_size: tail}) ) 
                        }
                    })

                })
            })
        })
    })

    return p
}

let test_params = generate_params()
console.log(`Param sets generated: ${test_params.length}`)

let strategies = test_params.map( inputs => StrategyTester(bars, inputs) )
strategies.sort( (a,b) => b.total_profit - a.total_profit )
//strategies.sort( (a,b) => a.loss_trades - b.loss_trades )
//strategies.sort( (a,b) => b.profit_trades - a.profit_trades )

console.log()
strategies.slice(0,10).forEach( (s,i) => {
    console.log(`[${i+1}] ${s.total_profit} (T: ${s.total_trades}, P: ${s.profit_trades}, L: ${s.loss_trades}), SL:${s.sl}, TP: ${s.tp}, UseTS: ${s.use_ts}, TStype: ${s.ts_type}, TStrg: ${s.ts_trg}, TS: ${s.ts}, Dist MA: ${s.dist_to_ma}, Tail size: ${s.tail_size}`)
})

let log_trades = false
let log_profit_trades = true
let log_loss_trades = true
let log_to_file = false
show_result(strategies[0], log_trades, log_profit_trades, log_loss_trades, log_to_file)


// -------------------------------------------------------

function StrategyTester(bars, params) {

    let strategy = {
        ma1: params.ma1,
        ma2: params.ma2,
        ma3: params.ma3,
        ma4: params.ma4,
        ma5: params.ma5,

        dist_to_ma: params.dist_to_ma,
        tail_size: params.tail_size,

        sl: params.sl,
        tp: params.tp,
        ts_trg: params.ts_trg,
        ts: params.ts,

        use_ts: params.use_ts,
        ts_type:  params.ts_type,

        allow_buy: params.allow_buy,
        allow_sell: params.allow_sell,
        signal_1bar: params.signal_1bar,
        signal_2bar: params.signal_2bar,

        save_trades: params.save_trades,

        total_profit: 0,
        profit: 0,
        loss: 0,
        total_trades: 0,
        profit_trades: 0,
        loss_trades: 0,
        trades: []
    }


    let order_open = false
    let order_type = 'none'

    let buy_open = 0
    let buy_close = 0
    let buy_stop_loss = 0
    let buy_take_profit = 0

    let sell_open = 0
    let sell_close = 0
    let sell_stop_loss = 0
    let sell_take_profit = 0

    let stop_loss = 0
    let take_profit = 0

    let trailing_stop_triggered = false
    let trailing_stop_trigger
    let trailing_stop = 0

    let signal = ''
    let flat_dist = 20


    let ma1 = WMA(bars, strategy.ma1)
    let ma2 = WMA(bars, strategy.ma2)
    let ma3 = WMA(bars, strategy.ma3)
    let ma4 = WMA(bars, strategy.ma4)
    let ma5 = WMA(bars, strategy.ma5)

    

    for(let i=26; i < bars.length; i++) {

        //if (bars[i].time.isAfter(moment('2017-12-24 23:55:00'))) break
        
        let cur = bars[i]
        let prev = bars[i-1]
        let last = bars[i-2]
    
        //let uptrend   = ma1[i] > ma2[i] && ma2[i] > ma3[i]
        //let downtrend = ma1[i] < ma2[i] && ma2[i] < ma3[i]
    
        let ma = {
            cur:  { ma1: ma1[i], ma2: ma2[i], ma3: ma3[i], ma4: ma4[i], ma5: ma5[i] },
            prev: { ma1: ma1[i-1], ma2: ma2[i-1], ma3: ma3[i-1], ma4: ma4[i-1], ma5: ma5[i-1] },
            last: { ma1: ma1[i-2], ma2: ma2[i-2], ma3: ma3[i-2], ma4: ma4[i-2], ma5: ma5[i-2] },
            slope: { ma1: ma1[i-10], ma2: ma2[i-10], ma3: ma3[i-10], ma4: ma4[i-10], ma5: ma5[i-10] }
        }
    
            
        if (order_open && order_type == 'Buy' && strategy.allow_buy)
            close_order('Buy', cur, prev)

        if (order_open && order_type == 'Sell' && strategy.allow_sell)
            close_order('Sell', cur, prev)

    
        if (!order_open && strategy.allow_buy && bounce_up(last, prev, cur, ma) )
            open_order('Buy', cur)

        if (!order_open && strategy.allow_sell && bounce_down(last, prev, cur, ma) )
            open_order('Sell', cur)
        
    }
    
    return strategy


    function bounce_up(last, prev, cur, ma) {

        let flat = Math.abs(ma.cur.ma5 - ma.cur.ma4) < flat_dist && Math.abs(ma.slope.ma5 - ma.slope.ma4) < flat_dist

        
        let up_1bar_signal = up_1bar()
        if (up_1bar_signal && strategy.signal_1bar) {
            signal = "up_1bar"
            stop_loss = strategy.sl
            take_profit = strategy.tp
            trailing_stop_trigger = strategy.ts_trg
            trailing_stop = strategy.ts
            
            return true
        }

        let up_2bar_signal = up_2bar()
        if (up_2bar_signal && strategy.signal_2bar) {
            signal = "up_2bar"
            stop_loss = strategy.sl
            take_profit = strategy.tp
            trailing_stop_trigger = strategy.ts_trg
            trailing_stop = strategy.ts
            return true
        }


        function up_1bar() {
            let top = cur.close > cur.open ? cur.close : cur.open
            let bottom = cur.close > cur.open ? cur.open : cur.close
            let body = top - bottom
            let top_tail = cur.high - top
            let bottom_tail = bottom - cur.low
            
            return bottom_tail > strategy.tail_size * body &&
                bottom >= ma.cur.ma1 && ( cur.low <= ma.cur.ma1 || cur.low - ma.cur.ma1 <= strategy.dist_to_ma )
        }

        function up_2bar() {

            return prev.close < prev.open && cur.close > cur.open && Math.abs(prev.close - cur.open) <= 20 &&
                prev.open >= ma.cur.ma1 && /*( prev.close <= ma.cur.ma1 || prev.close - ma.cur.ma1 <= 250 ) &&*/
                cur.close >= ma.cur.ma1 && ( cur.open <= ma.cur.ma1 || cur.open - ma.cur.ma1 <= strategy.dist_to_ma )
        }

    }


    function bounce_down(last, prev, cur, ma) {

        let flat = Math.abs(ma.cur.ma5 - ma.cur.ma4) < flat_dist && Math.abs(ma.slope.ma5 - ma.slope.ma4) < flat_dist

        
        let down_1bar_signal = down_1bar(ma.cur.ma5)
        if (down_1bar_signal && strategy.signal_1bar) {
            signal = "down_1bar"
            stop_loss = strategy.sl
            take_profit = strategy.tp
            trailing_stop_trigger = strategy.ts_trg
            trailing_stop = strategy.ts
            return true
        }

        let down_2bar_signal = down_2bar(ma.prev.ma5, ma.cur.ma5)
        if (down_2bar_signal && strategy.signal_2bar) {
            signal = "down_2bar"
            stop_loss = strategy.sl
            take_profit = strategy.tp
            trailing_stop_trigger = strategy.ts_trg
            trailing_stop = strategy.ts
            return true
        }


        function down_1bar(cur_line) {
            let top = cur.close > cur.open ? cur.close : cur.open
            let bottom = cur.close > cur.open ? cur.open : cur.close
            let body = top - bottom
            let top_tail = cur.high - top
            let bottom_tail = bottom - cur.low

            return top_tail > strategy.tail_size * body &&
                top <= ma.cur.ma1 && ( cur.high >= ma.cur.ma1 || ma.cur.ma1 - cur.high <= strategy.dist_to_ma )
        }

        function down_2bar(prev_line, cur_line) {

            return prev.close > prev.open && cur.close < cur.open && Math.abs(prev.close - cur.open) <= 20 &&
                prev.open <= ma.cur.ma1 && /*( prev.close >= ma.cur.ma1 || ma.cur.ma1 - prev.close <= 250 ) &&*/
                cur.close <= ma.cur.ma1 && ( cur.open >= ma.cur.ma1 || ma.cur.ma1 - cur.open <= strategy.dist_to_ma )
        }

    }



    function open_order(type, cur) {
        order_type = type
        order_open = true
        strategy.total_trades += 1

        if (type == 'Buy') {
            buy_open = cur.close
            buy_stop_loss = buy_open - stop_loss
            buy_take_profit =  buy_open + take_profit
        }

        if (type == 'Sell') {
            sell_open = cur.close
            sell_stop_loss = sell_open + stop_loss
            sell_take_profit = sell_open - take_profit
        }
        
        trailing_stop_triggered = false

        if (strategy.save_trades)
            strategy.trades.push({
                type: type,
                start: cur.time,
                end: null,
                open: cur.close,
                close: null,
                profit: 0,
                enter: signal,
                exit: null
            })
    }


    function close_order(type, cur) {
        
        // close with stop

        if (order_open && !trailing_stop_triggered) {
            
            if ( (type == 'Buy'  && cur.low <= buy_stop_loss) || (type == 'Sell' && cur.high >= sell_stop_loss) ) {
                order_open = false
                strategy.total_profit -= stop_loss
                strategy.loss += stop_loss
                strategy.loss_trades += 1

                let price = type == 'Buy' ? cur.low : cur.high
                if (strategy.save_trades) {
                    strategy.trades[strategy.total_trades-1].end = cur.time
                    strategy.trades[strategy.total_trades-1].close = price
                    strategy.trades[strategy.total_trades-1].exit = 'SL'
                    strategy.trades[strategy.total_trades-1].profit = -stop_loss
                }
            }
            
        }

        // set zero loss

        if (order_open && strategy.use_ts && strategy.ts_type == 'zero' && !trailing_stop_triggered) {

            if (type == 'Buy' && cur.low >= buy_open + trailing_stop_trigger) {
                buy_stop_loss = buy_open + trailing_stop
                trailing_stop_triggered = true
            }

            if (type == 'Sell' && cur.high <= sell_open - trailing_stop_trigger) {
                sell_stop_loss = sell_open - trailing_stop
                trailing_stop_triggered = true
            }
        }

        // set trail stop

        if (order_open && strategy.use_ts && strategy.ts_type == 'trail' && !trailing_stop_triggered) {

            if (type == 'Buy' && cur.low >= buy_open + trailing_stop_trigger) {
                buy_stop_loss = cur.low - trailing_stop
                trailing_stop_triggered = true
            }

            if (type == 'Sell' && cur.high <= sell_open - trailing_stop_trigger) {
                sell_stop_loss = cur.high + trailing_stop
                trailing_stop_triggered = true
            }
        }

        // move trail stop

        if (order_open && strategy.use_ts && strategy.ts_type == 'trail' && trailing_stop_triggered) {

            if (type == 'Buy' && cur.low - buy_stop_loss > trailing_stop ) {
                buy_stop_loss = cur.low - trailing_stop
            }

            if (type == 'Sell' && cur.high + sell_stop_loss > trailing_stop) {
                sell_stop_loss = cur.high + trailing_stop
            }
        }

        // close with trailing stop

        if (order_open && strategy.use_ts && trailing_stop_triggered) {
            
            if ( (type == 'Buy'  && cur.low <= buy_stop_loss) || (type == 'Sell' && cur.high >= sell_stop_loss) ) {

                order_open = false
                strategy.total_profit += trailing_stop
                strategy.profit += trailing_stop
                strategy.profit_trades += 1

                let price = type =='Buy' ? cur.low : cur.high

                if (strategy.save_trades) {
                    strategy.trades[strategy.total_trades-1].end = cur.time
                    strategy.trades[strategy.total_trades-1].close = price
                    strategy.trades[strategy.total_trades-1].exit = 'TS'
                    strategy.trades[strategy.total_trades-1].profit = trailing_stop
                }
            }
        }

        // take profit

        if ( order_open ) {

            if ( (type == 'Buy'  && cur.high >= buy_take_profit) || (type == 'Sell' && cur.low  <= sell_take_profit) ) {
                order_open = false
                strategy.total_profit += take_profit
                strategy.profit += take_profit
                strategy.profit_trades += 1

                let price = type == 'Buy' ? buy_take_profit : sell_take_profit

                if (strategy.save_trades) {
                    strategy.trades[strategy.total_trades-1].end = cur.time
                    strategy.trades[strategy.total_trades-1].close = price
                    strategy.trades[strategy.total_trades-1].exit = 'TP'
                    strategy.trades[strategy.total_trades-1].profit = take_profit
                }
            }
        }
    }


    // Weighted Moving Average

    function WMA(bars, period) {
                    
        return bars.map( (bar,i) => {
            
            if (i <= period) 
                return bar['close']
            
            // WMA = (w1*close1 + w2*close2 + ... wN*closeN) / (1 + 2 + ... + N)
            // wn = 1,2,3,..,N

            let sum = 0
            let weights = 0

            for (var k = 1; k <= period; k++) { 
                sum += bars[i-period-1+k]['close'] * k
                weights += k
            }
            
            return sum / weights
        })
    }

}


function show_result(strategy, log_trades=false, log_profit_trades=false, log_loss_trades=false, log_to_file = false) {

    console.log('\n------------------------------------------')
    console.log(`Dist to MA: ${strategy.dist_to_ma}`)
    console.log(`Tail size: ${strategy.tail_size}`)
    console.log(`1 bar signals: ${strategy.signal_1bar}`)
    console.log(`2 bar signals: ${strategy.signal_2bar}`)
    console.log(`Allow buy:   ${strategy.allow_buy}`)
    console.log(`Allow sell:  ${strategy.allow_sell}`)
    console.log(`Save trades: ${strategy.save_trades}`)

    console.log()
    console.log(`Use TS: ${strategy.use_ts}`)
    console.log(`TS Type: ${strategy.ts_type}`)
    console.log(`SL: ${strategy.sl}`)
    console.log(`TP: ${strategy.tp}`)
    console.log(`TS trg: ${strategy.ts_trg}`)
    console.log(`TS: ${strategy.ts}`)
    
    

    if (log_trades) {
        let trades = strategy.trades
    
        trades = trades.filter( trade => {
            return (trade.profit > 0 && log_profit_trades) || (trade.profit < 0 && log_loss_trades)
        })
        
        console.log('\n')
        console.log(`Trades [${trades.length}]:`)

        let report_csv = 'no,type,start,end,enter,exit,profit,deposit\r\n'
        let deposit = 0

        trades.forEach( (trade,i) => {
            if (!log_to_file) {
                console.log()
                console.log(`[${i+1}] ${trade.type} ${ trade.profit > 0 ? '+' : '' }${trade.profit}`)
                console.log(`    ${trade.start.format('MMM D, HH:mm')} at ${trade.open} on ${trade.enter}`)
                console.log(`    ${trade.end.format('MMM D, HH:mm')} at ${trade.close} on ${trade.exit}`)
            }
            deposit += trade.profit
            report_csv += `${i+1},${trade.type},${trade.start.format('YYYY-MM-DD HH:mm')},${trade.end.format('YYYY-MM-DD HH:mm')},${trade.enter},${trade.exit},${trade.profit},${deposit}\r\n`
        })
        console.log()
        if (log_to_file)
            fs.writeFileSync(path.join(__dirname, `${filename} deposit.csv`), report_csv)
    }
    
    console.log()
    console.log(`Total:  ${strategy.total_profit} pt        - ${strategy.total_trades} trades`)
    console.log(`Profit: ${strategy.profit} pt (${Math.round(strategy.profit/(strategy.profit+strategy.loss)*100)}%)  - ${strategy.profit_trades} trades (${Math.round(strategy.profit_trades/strategy.total_trades*100)}%)`)
    console.log(`Loss:   ${strategy.loss} pt (${Math.round(strategy.loss/(strategy.profit+strategy.loss)*100)}%)  - ${strategy.loss_trades} trades (${Math.round(strategy.loss_trades/strategy.total_trades*100)}%)`)
}