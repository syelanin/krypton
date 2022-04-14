const path = require('path')
const fs = require('fs')
const config = require('config')
const crypto = require('crypto')
const request = require('superagent')
const moment = require('moment')
const WebSocket = require('ws')


class Bitfinex {

    constructor(conf = null) {
        this.config

        if (!conf)
            this.config = config.get('exchange.bitfinex')
        else
            this.config = conf

        this.base_dir = path.join(__dirname,'../../files/data')
        this.ws_channels = []

        this.wss
    }


    // v1 api endpoints -------------------------------------------

    balances() {
        return this.private_endpoint_v1('balances')
    }


    active_orders() {
        return this.private_endpoint_v1('orders')
    }


    inactive_orders() {
        return this.private_endpoint_v1('orders/hist')
    }


    new_order(symbol, amount, price, side, type) {
        return this.private_endpoint_v1('order/new', {
            symbol: symbol,
            amount: amount,
            price: price,
            side: side,
            type: type,
            exchange: 'bitfinex',
            //ocoorder:
            //oco_buy_price
            //oco_sell_price
        })
        //exchange market
        //exchange limit
        //exchange stop
        //exchange trailing-stop
        //exchange fill-or-kill
    }


    cancel_order(id) {
        return this.private_endpoint_v1('order/cancel', {
            id: id
        })
    }


    cancel_all() {
        return this.private_endpoint_v1('order/cancel/all')
    }

    
    // v2 api endpoints -------------------------------------------


    wallets() {
        return this.private_endpoint_v2('wallets')
            .then( res => {
                return res.map( wallet => {
                    return {
                        type: wallet[0],
                        currrency: wallet[1],
                        balance: wallet[2],
                        interest: wallet[3],
                        available_balance: wallet[4]
                    }
                })
            })
    }
    
    
    candles(symbol, timeframe, limit=1, start=null, end=null) {

        let time = ''
        if (start)
            time += `&start=${start.valueOf()}`
        if (end)
            time += `&end=${end.valueOf()}`
        
        let url = `${this.config.url}/v2/candles/trade:${timeframe}:t${symbol.toUpperCase()}/hist?limit=${limit}${time}`
        
        return request
            .get(url)
            .accept('json')
            .then( res => {
                
                return res.body.map( bar => {
                    return {
                        symbol: `t${symbol.toUpperCase()}`,
                        timeframe: timeframe,
                        time: moment(bar[0]),
                        open: bar[1],
                        close: bar[2],
                        high: bar[3],
                        low: bar[4],
                        volume: bar[5]
                    }
                })
            })
            .catch( err => err.response ? err.response.text : err.status )
    }


    trades(symbol, params={}) {
        return this.public_endpoint_v2(`trades/t${symbol}/hist`, params)
            .then( res => {
                return res.map( trade => {
                    return {
                        id: trade[0],
                        time: moment(trade[1]),
                        amount: trade[2],
                        price: trade[3]
                    }
                })
            })
    }


    orderbook(symbol, params={}) {
        return this.public_endpoint_v2(`book/t${symbol}/P0`, params)
            .then( res => {
                return res.map( order => {
                    return {
                        price: order[0],
                        count: order[1],
                        amount: order[2]
                    }
                })
            })
    }


    
    // internal methods ---------------------------------


    private_endpoint_v1(endpoint, data = {}) {
        let path = `/v1/${endpoint}`
        let nonce = Date.now().toString()
        let body = Object.assign({}, data, {
            request: path, 
            nonce: nonce
        })

        let payload = new Buffer(JSON.stringify(body)).toString('base64')

        let signature = crypto
            .createHmac('sha384', this.config.secret)
            .update(payload)
            .digest('hex')
    
        return request
            .post(`${this.config.url}${path}`)
            .set({
                'X-BFX-APIKEY': this.config.key,
                'X-BFX-PAYLOAD': payload,
                'X-BFX-SIGNATURE': signature,
                'content-type': 'application/json'
            })
            .send(body)
            .accept('json')
            .then( res => {
                return res.body
            })
            .catch( err => err.response ? err.response.text : err.status )
    }


    private_endpoint_v2(endpoint, data = {}) {
        let path = `/v2/auth/r/${endpoint}`
        let nonce = Date.now() * 1000
        let payload = `/api${path}${nonce}${JSON.stringify(data)}`
        
        let signature = crypto
            .createHmac('sha384', this.config.secret)
            .update(payload)
            .digest('hex')
    
        return request
            .post(`${this.config.url}${path}`)
            .set({
                'bfx-nonce': nonce,
                'bfx-apikey': this.config.key,
                'bfx-signature': signature,
                'content-type': 'application/json'
            })
            .send(data)
            .accept('json')
            .then( res => {
                return res.body
            })
            .catch( err => err.response ? err.response.text : err.status )
    }


    public_endpoint_v2(endpoint, query={}) {
        let path = `/v2/${endpoint}`
        let params = Object.assign({}, query)
    
        return request
            .get(`${this.config.url}${path}`)
            .query(params)
            .accept('json')
            .then( res => {
                return res.body
            })
            .catch( err => err.response ? err.response.text : err.status )
    }

    
    // websocket ---------------------------------


    ws_orderbook(symbol, handler) {
        this.ws_channels.push({
            name: 'book',
            id: null,
            symbol: symbol,
            handler: handler
        })

        this.wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'book',
            symbol: `t${symbol}`,
            freq: 'F1',
            prec: 'P0'
        }))
    }

    ws_trades(symbol, handler) {
        this.ws_channels.push({
            name: 'trades',
            id: null,
            symbol: symbol,
            handler: handler
        })

        this.wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'trades',
            symbol: `t${symbol}`
        }))
    }

    ws_ticker(symbol, handler) {
        this.ws_channels.push({
            name: 'ticker',
            id: null,
            symbol: symbol,
            handler: handler
        })

        this.wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'ticker',
            symbol: `t${symbol}`
        }))
    }

    ws_candles(symbol, timeframe, handler) {
        this.ws_channels.push({
            name: 'candles',
            id: null,
            symbol: symbol,
            timeframe: timeframe,
            handler: handler
        })

        this.wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'candles',
            key: `trade:${timeframe}:t${symbol}`
        }))
    }


    ws_init(callback) {

        function is_event(res) {
            return !Array.isArray(res)
        }

        function is_heartbeat(res) {
            return Array.isArray(res) && res[1] == 'hb'
        }

        function is_snapshot(res) {
            return Array.isArray(res) && Array.isArray(res[1]) && Array.isArray(res[1][0])
        }

        function is_update(res) {
            return Array.isArray(res) && ( 
                ( Array.isArray(res[1]) && !Array.isArray(res[1][0]) ) ||
                res[1] == 'tu'
            )
        }
        

        this.wss = new WebSocket('wss://api.bitfinex.com/ws/2')


        this.wss.onmessage = (msg) => {
            
            let res = JSON.parse(msg.data)

            //console.log('message:', res)
            
            
            if ( is_heartbeat(res) ) {

                this.ws_channels.forEach(channel => {
                
                    if (channel.id == res[0])
                        channel.handler('event', {
                            event: 'hb',
                            time: moment(),
                            name: channel.name,
                            id: channel.id
                        })

                })
                
            }

            
            if ( is_event(res) ) {

                //console.log('event:', res)

                this.ws_channels.forEach(channel => {

                    if (res.event == 'subscribed') {
                
                        if (res.channel == channel.name) {
    
                            if ( res.channel == 'book' && res.symbol.includes(channel.symbol) )
                                channel.id = res.chanId

                            if ( res.channel == 'trades' && res.symbol.includes(channel.symbol) )
                                channel.id = res.chanId

                            if ( res.channel == 'ticker' && res.pair.includes(channel.symbol) )
                                channel.id = res.chanId
    
                            if ( res.channel == 'candles' && res.key.includes(channel.symbol) && res.key.split(':')[1] == channel.timeframe ) 
                                channel.id = res.chanId    
                            
                            channel.handler('event', res)

                        }

                    }

                })

            }

            
            if ( is_snapshot(res) ) {

                let channel_id = res[0]
                let objects = res[1]

                this.ws_channels.forEach(channel => {
                    
                    if ( channel.id == channel_id ) {
                        
                        let data

                        if ( channel.name == 'book' ) {
                            
                            data = objects.map(order => {
                                return {
                                    symbol: channel.symbol,
                                    time: moment(),
                                    price: order[0], 
                                    amount: order[2],
                                    count: order[1]
                                }
                            })
                            
                        }

                        if ( channel.name == 'trades' ) {
                            
                            data = objects.map(trade => {
                                return {
                                    symbol: channel.symbol,
                                    time: moment(trade[1]), 
                                    price: trade[3],
                                    amount: trade[2]
                                }
                            })
                            
                        }

                        if ( channel.name == 'candles' ) {
                            
                            data = objects.map(candle => {
                                return {
                                    symbol: channel.symbol,
                                    timeframe: channel.timeframe,
                                    stamp: moment(candle[0]),
                                    open: candle[1],
                                    close: candle[2],
                                    high: candle[3],
                                    low: candle[4],
                                    volume: candle[5]
                                }
                            })
                            
                        }

                        channel.handler('snapshot', data)

                    }

                })

            }


            if ( is_update(res) ) {

                let channel_id = res[0]

                this.ws_channels.forEach(channel => {
                    
                    if ( channel.id == channel_id ) {
                        
                        let data

                        if ( channel.name == 'book' ) {

                            let order = res[1]
                            
                            data = {
                                symbol: channel.symbol,
                                time: moment(),
                                price: order[0],
                                amount: order[2],
                                count: order[1]
                            }
                            
                        }

                        if ( channel.name == 'trades' ) {
                            
                            let flag = res[1]
                            let trade = res[2]

                            if ( flag == 'tu' ) {
                                data = {
                                    symbol: channel.symbol,
                                    time: moment(trade[1]),
                                    price: trade[3],
                                    amount: trade[2]
                                }
                            }
                            
                        }

                        if ( channel.name == 'ticker' ) {
                            
                            let ticker = res[1]

                            data = {
                                symbol: channel.symbol,
                                time: moment(),
                                bid: ticker[0],
                                ask: ticker[2],
                                spread: Math.floor((ticker[2] - ticker[0])*100)/100,
                                last_price: ticker[6]
                            }
                            
                        }

                        if ( channel.name == 'candles' ) {
                            
                            let candle = res[1]

                            data = {
                                symbol: channel.symbol,
                                timeframe: channel.timeframe,
                                time: moment(),
                                stamp: moment(candle[0]),
                                open: candle[1],
                                close: candle[2],
                                high: candle[3],
                                low: candle[4],
                                volume: candle[5]
                            }
                            
                        }

                        channel.handler('update', data)

                    }

                })

            }
            
        }

        this.wss.onopen = callback

    }

}


module.exports = Bitfinex
