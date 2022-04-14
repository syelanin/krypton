
const Bitfinex = require('../lib/exchange/bitfinex')
const bitfinex = new Bitfinex()
const moment = require('moment')

//bitfinex.wallets().then( res => console.log(res) )
//bitfinex.inactive_orders().then( res => console.log(res) )
//bitfinex.candles('ltcusd', '15m', 10).then( res => console.log(res) )
//bitfinex.trades('BTCUSD',{limit:5}).then( res => console.log(res) )
//bitfinex.orderbook('BTCUSD').then( res => console.log(res) )

let candle 

bitfinex.ws_init(() => {
    console.log('init')
    
    /*bitfinex.ws_trades((type, data) => {
        console.log()
        console.log(type)
        console.log(data)
    })*/

    bitfinex.ws_candles('1m', (type, data) => {
        
        if (type == 'update' && data.time.minutes() == data.stamp.minutes()) {

            console.log()
            //console.log(type)
            //console.log(data)

            if (!candle) {
                candle = data
                return
            }

            if (data.stamp.valueOf() == candle.stamp.valueOf()) {
                console.log("=", data)
            }
            else {
                console.log('***', candle)
            }

            candle = data

        }
        
    })

    /*bitfinex.ws_candles('1h', (type, data) => {
        
        if (type == 'update' && data.stamp.hours() == moment().hours()) {
            console.log()
            console.log(type)
            console.log(data)
        }
            
    })*/

    /*bitfinex.ws_orderbook((type,data) => {
        console.log(type)
        console.log(data)
    })*/
})
