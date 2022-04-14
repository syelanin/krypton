const { Pool, Client } = require('pg')
const connectionString = 'postgresql://postgres:postgres@localhost:5432/crypto'

let client


function connect() {
    client = new Client({connectionString: connectionString})
    return client.connect()
}


function close() {
    return client.end()
}


function load() {
    return client.query('select * from bitfinex_candles')
}


function insert_ticker(table, ticker) {
    return client.query(`insert into ${table} values ($1,$2,$3,$4,$5,$6)`, 
        [ticker.symbol, ticker.time.format(), ticker.bid, ticker.ask, ticker.spread, ticker.last_price])
}


function insert_candle(table, candle) {
    return client.query(`insert into ${table} values ($1,$2,$3,$4,$5,$6,$7,$8)`, 
        [candle.symbol, candle.timeframe, candle.stamp.format(), candle.open, candle.high, candle.low, candle.close, candle.volume])
}


function insert_orderbook(table, orders) {
    let values = orders.map(order => `('${order.symbol}','${order.time.format()}',${order.price},${order.amount},${order.count})`).join(',')
    return client.query(`insert into ${table} values ${values}`)
}


function insert_trades(table, trades) {
    let values = trades.map(trade => `('${trade.symbol}','${trade.time.format()}',${trade.price},${trade.amount})`).join(',')
    return client.query(`insert into ${table} values ${values}`)
}


module.exports = {
    connect: connect,
    close: close,
    load: load,
    insert_ticker: insert_ticker,
    insert_candle: insert_candle,
    insert_orderbook: insert_orderbook,
    insert_trades: insert_trades
}
