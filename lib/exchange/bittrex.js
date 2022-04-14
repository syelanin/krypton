const config = require('config')
const crypto = require('crypto')
const request = require('superagent')
const moment = require('moment')


class Bittrex {

    constructor(conf = null) {
        this.config

        if (!conf)
            this.config = config.get('exchange.bittrex')
        else
            this.config = conf
    }


    // v1 api endpoints -------------------------------------------

    markets() {
        return this.public_endpoint('/public/getmarkets')
    }


    balances() {
        return this.private_endpoint('/account/getbalances')
    }


    active_orders() {
        return this.private_endpoint('orders')
    }


    inactive_orders() {
        return this.private_endpoint('orders/hist')
    }


    new_order(symbol, amount, price, side, type) {
        return this.private_endpoint('order/new', {
            symbol: symbol,
            amount: amount,
            price: price,
            side: side,
            type: type,
            exchange: 'bittrex',
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
        return this.private_endpoint('order/cancel', {
            id: id
        })
    }


    cancel_all() {
        return this.private_endpoint('order/cancel/all')
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


    
    // internal methods ---------------------------------

    public_endpoint(endpoint, params={}, version='1.1') {

        let path = `/v${version}/${endpoint}`
        let params_str = Object.keys(params).map( key => `${key}=${params[key]}`).join('&')
        params_str = params_str.length ? '?'+params_str : ''

        let uri = `${this.config.url}${path}${params_str}`

        return request
            .get(uri)
            .set({
                'content-type': 'application/json'
            })
            .accept('json')
            .then( res => {
                return res.body
            })
            .catch( err => err.response ? err.response.text : err.status )
    }


    private_endpoint(endpoint, params={}, version='1.1') {

        let path = `/v${version}/${endpoint}`
        let nonce = Date.now().toString()
        
        let params_obj = Object.assign({
                apikey: this.config.key,
                nonce: Date.now().toString()
            }, data)
        
        let params_str = Object.keys(params_obj).map( key => `${key}=${params_obj[key]}`).join('&')

        let uri = `${this.config.url}${path}?${params_str}`

        let signature = crypto
            .createHmac('sha512', this.config.secret)
            .update(uri)
            .digest('hex')
    
        return request
            .get(uri)
            .set({
                'apisign': signature,
                'content-type': 'application/json'
            })
            .accept('json')
            .then( res => {
                return res.body
            })
            .catch( err => err.response ? err.response.text : err.status )
    }


}


module.exports = Bittrex
