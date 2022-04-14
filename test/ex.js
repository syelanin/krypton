const moment = require('moment')

/*const Bittrex = require('../lib/exchange/bittrex')

const bittrex = new Bittrex()

bittrex.markets().then( res => {
    res.result.forEach(obj => console.log(`${obj.BaseCurrency =='USDT' ? '* ' : ''} ${obj.MarketCurrency}-${obj.BaseCurrency}: ${obj.MinTradeSize}`));
})*/


const CEX = require('../lib/exchange/cex')
const cex = new CEX()

//cex.currency_limits().then( res => res.forEach( pair => console.log(pair)) )

//cex.balance().then( res => console.log(res.BTC.available) )

//cex.ticker('BTC','USD').then( res => console.log(res) )

//cex.tickers('BTC','USD').then( res => res.forEach(pair => console.log(pair)) )

//cex.convert('BTC', 'USD', 0.002).then( res => console.log(res) )

//cex.candles(moment('2018-02-05'), 'BTC', 'USD').then( res => res.data1d.forEach(d => console.log(d.time) ) )

//cex.orderbook('BTC', 'USD').then( res => console.log(res) )

//cex.trades('BTC', 'USD').then( res => console.log(res) )

cex.archived_orders('BTC', 'USD').then( res => console.log(res) )