const db = require('../lib/data/db/postgres')
const moment = require('moment')

const Bitfinex = require('../lib/exchange/bitfinex')
const bitfinex = new Bitfinex()


let candles = {}

db.connect()
.then(() => console.log('db connected'))
.catch(e => console.error(e.stack))


bitfinex.ws_init(() => {
    console.log('websocket init')
    console.log()

    bitfinex.ws_ticker('BTCUSD', (type, data) => {
        if (type == 'update')
            save_ticker('bitfinex_ticker', 'BTCUSD', data)
    })

    bitfinex.ws_candles('BTCUSD', '1m', (type, data) => {
        if (type == 'update')
            save_candle('bitfinex_candles', 'BTCUSD', data)
    })

    bitfinex.ws_candles('BTCUSD', '1h', (type, data) => {
        if (type == 'update')
            save_candle('bitfinex_candles', 'BTCUSD', data)
    })

    bitfinex.ws_candles('BTCUSD', '1d', (type, data) => {
        if (type == 'update')
            save_candle('bitfinex_candles', 'BTCUSD', data)
    })

    bitfinex.ws_orderbook('BTCUSD', (type, data) => {

        if (type == 'snapshot')
            save_book_snapshot('bitfinex_orderbook', 'BTCUSD', data)
        if (type == 'update')
            save_book_update('bitfinex_orderbook', 'BTCUSD', data)
    })

    bitfinex.ws_trades('BTCUSD', (type, data) => {

        if (type == 'snapshot')
            save_trades_snapshot('bitfinex_trades', 'BTCUSD', data)
        if (type == 'update')
            save_trades_update('bitfinex_trades', 'BTCUSD', data)
    })

})



function save_ticker(table, symbol, data) {
    
    db.insert_ticker(table, data)
    .then(res => {
        console.log(`${moment().format()}: ${table} - ${symbol} - insert ticker (${res.rowCount})`)
    })
    .catch(e => console.error(e.stack))

}


function save_candle(table, symbol, data) {
    
    let tf_num
    let tf_dim

    if (data.timeframe.includes('m')) {
        tf_dim = 'm'
        tf_num = parseInt(data.timeframe.split('m')[0])
    }

    if (data.timeframe.includes('h')) {
        tf_dim = 'h'
        tf_num = parseInt(data.timeframe.split('h')[0])
    }


    if (
         ( tf_dim == 'm' && Math.floor(data.time.minutes()/tf_num)*tf_num == data.stamp.minutes() )
       ) {

        if (!candles[data.timeframe]) {
            candles[data.timeframe] = Object.assign({}, data)
            return
        }

        if (data.stamp.valueOf() != candles[data.timeframe].stamp.valueOf()) {
            
            let candle = {
                symbol: candles[data.timeframe].symbol,
                timeframe: candles[data.timeframe].timeframe,
                stamp: candles[data.timeframe].stamp,
                open: candles[data.timeframe].open,
                high: candles[data.timeframe].high,
                low: candles[data.timeframe].low,
                close: candles[data.timeframe].close,
                volume: candles[data.timeframe].volume
            }
            
            db.insert_candle(table, candle)
            .then(res => {
                console.log(`${moment().format()}: ${table} - ${symbol} - ${candle.timeframe} - insert candle ${candle.stamp.format()} (${res.rowCount})`)
            })
            .catch(e => console.error(e.stack))
        }

        candles[data.timeframe] = Object.assign({}, data)

    }
}


function save_book_snapshot(table, symbol, data) {
    
    db.insert_orderbook(table, data)
    .then(res => {
        console.log(`${moment().format()}: ${table} - ${symbol} - insert orders (${res.rowCount})`)
    })
    .catch(e => console.error(e.stack))

}


function save_book_update(table, symbol, data) {
    
    db.insert_orderbook(table, [data])
    .then(res => {
        console.log(`${moment().format()}: ${table} - ${symbol} - insert order (${res.rowCount})`)
    })
    .catch(e => console.error(e.stack))

}


function save_trades_snapshot(table, symbol, data) {
    
    db.insert_trades(table, data)
    .then(res => {
        console.log(`${moment().format()}: ${table} - ${symbol} - insert trades (${res.rowCount})`)
    })
    .catch(e => console.error(e.stack))

}


function save_trades_update(table, symbol, data) {
    
    db.insert_trades(table, [data])
    .then(res => {
        console.log(`${moment().format()}: ${table} - ${symbol} - insert trade (${res.rowCount})`)
    })
    .catch(e => console.error(e.stack))

}

