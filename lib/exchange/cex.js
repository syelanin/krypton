const config = require('config')
const crypto = require('crypto')
const request = require('superagent')
const moment = require('moment')


class Cex {

    constructor(conf = null) {
        this.config

        if (!conf)
            this.config = config.get('exchange.cex')
        else
            this.config = conf
    }

    // public endpoints -------------------------------------------

    currency_limits() {
        return this.public_endpoint('currency_limits').then(res => res.data.pairs)
    }

    ticker(sym1, sym2) {
        return this.public_endpoint(`ticker/${sym1}/${sym2}`)
    }

    tickers(sym1, sym2) {
        return this.public_endpoint(`tickers/${sym1}/${sym2}`).then(res => res.data)
    }

    convert(sym1, sym2, amount) {
        return this.private_endpoint(`convert/${sym1}/${sym2}`, {amnt: amount}).then(res => res.amnt)
    }

    candles(sym1, sym2, date) {
        return this.public_endpoint(`ohlcv/hd/${date.format('YYYYMMDD')}/${sym1}/${sym2}`).then(res => {
            let data1m = JSON.parse(res.data1m).map(data => {
                return {
                    time: moment.unix(data[0]),
                    open: data[1],
                    high: data[2],
                    low: data[3],
                    close: data[4],
                    volume: data[5]
                }
            })

            let data1h = JSON.parse(res.data1h).map(data => {
                return {
                    time: moment.unix(data[0]),
                    open: data[1],
                    high: data[2],
                    low: data[3],
                    close: data[4],
                    volume: data[5]
                }
            })

            let data1d = JSON.parse(res.data1d).map(data => {
                return {
                    time: moment.unix(data[0]),
                    open: data[1],
                    high: data[2],
                    low: data[3],
                    close: data[4],
                    volume: data[5]
                }
            })

            return {
                '1m': data1m,
                '1h': data1h,
                '1d': data1d
            }
        })
    }

    orderbook(sym1, sym2) {
        return this.public_endpoint(`order_book/${sym1}/${sym2}`).then(res => {
            return {
                time: moment.unix(res.timestamp),
                bids: res.bids.map(row => ({bid: row[0], volume: row[1]}) ),
                asks: res.asks.map(row => ({ask: row[0], volume: row[1]}) ),
                pair: res.pair,
                id: res.id,
                sell_total: parseFloat(res.sell_total),
                buy_total: parseFloat(res.buy_total)
            }
        })
    }

    trades(sym1, sym2) {
        return this.public_endpoint(`trade_history/${sym1}/${sym2}`).then(res => {
            return res.map(trade => {
                return {
                    type: trade.type,
                    date: moment.unix(trade.date),
                    amount: parseFloat(trade.amount),
                    price: parseFloat(trade.price),
                    tid: parseInt(trade.tid)
                }
            })
        })
    }

    // private endpoints -------------------------------------------

    balance() {
        return this.private_endpoint('balance/')
    }

    open_orders() {
        return this.private_endpoint('open_orders/').then(res => {
            return res.map(order => {
                return {
                    id: parseInt(order.id),
                    time: moment(order.time),
                    type: order.type,
                    price: parseFloat(order.price),
                    amount: parseFloat(order.amount),
                    pending: parseFloat(order.pending),
                    symbol1: order.symbol1,
                    symbol2: order.symbol2
                }
            })
        })
    }

    open_orders_pair(sym1, sym2) {
        return this.private_endpoint(`open_orders/${sym1}/${sym2}/`).then(res => {
            return res.map(order => {
                return {
                    id: parseInt(order.id),
                    time: moment(order.time),
                    type: order.type,
                    price: parseFloat(order.price),
                    amount: parseFloat(order.amount),
                    pending: parseFloat(order.pending),
                    symbol1: order.symbol1,
                    symbol2: order.symbol2
                }
            })
        })
    }

    active_orders_status(list=[]) {
        return this.private_endpoint('active_orders_status/', {orders_list: list}).then(res => {
            return res.map(order => {
                return {
                    id: parseInt(order[0]),
                    amount: parseFloat(order[1]),
                    remains: parseFloat(order[2])
                }
            })
        })
    }

    archived_orders(sym1, sym2) {
        return this.private_endpoint(`archived_orders/${sym1}/${sym2}/`).then(res => {
            return res.map(order => {
                return {
                    id: parseInt(order.id),
                    type: order.type,
                    time: moment(order.time),
                    status: order.status,
                    amount: parseFloat(order.amount),
                    price: parseFloat(order.price),
                    remains: parseFloat(order.remains),
                    tradingFeeMaker: parseFloat(order.tradingFeeMaker),
                    tradingFeeTaker: parseFloat(order.tradingFeeTaker),
                }
            })
        })
    }

    cancel_order(sym1, sym2, id) {
        return this.private_endpoint(`cancel_order/${sym1}/${sym2}/`, {id: id})
    }

    cancel_orders_pair(sym1, sym2) {
        return this.private_endpoint(`cancel_orders/${sym1}/${sym2}/`).then(res => res.data)
    }

    place_order(sym1, sym2, type='buy', amount, price) {
        return this.private_endpoint(`place_order/${sym1}/${sym2}/`, {type: type, amount: amount, price: price}).then(order => {
            if (order.complete) {
                return {
                    id: parseInt(order.id),
                    complete: order.complete == 'true',
                    time: moment(order.time),
                    pending: parseFloat(order.pending),
                    amount: parseFloat(order.amount),
                    type: order.type,
                    price: parseFloat(order.price)
                }
            }
            else {
                return {
                    id: parseInt(order.id),
                    symbol2Amount: parseInt(10000),
                    symbol1Amount: parseInt(19970000),
                    time: moment(order.time),
                    message: order.message,
                    type: order.type
                }
            }
        })
    }

    get_order(id) {
        return this.private_endpoint(`get_order/`, {id: id}).then(order => {
            return {
                id: parseInt(order.id),
                type: order.type,
                time: moment(order.time),
                pos: order.pos,
                status: order.status,
                symbol1: order.symbol1,
                symbol2: order.symbol2,
                amount: parseFloat(order.amount),
                price: parseFloat(order.price),
                remains: parseFloat(order.remains),
                tradingFeeMaker: parseFloat(order.tradingFeeMaker),
                tradingFeeTaker: parseFloat(order.tradingFeeTaker),
                tradingFeeStrategy: order.tradingFeeStrategy,
            }
        })
    }

    get_myfee(list=[]) {
        return this.private_endpoint('get_myfee/').then(res => res.data)
    }

    get_position(id) {
        return this.private_endpoint(`get_position/`, {id: id}).then(res => {
            return {
                id: parseInt(res.data.id),
                pair: res.data.pair,
                amount: parseFloat(res.data.amount),
                otime: moment(res.data.otime),
                ptype: res.data.ptype,
                okind: res.data.okind,
                oorder: parseInt(res.data.oorder),
                status: res.data.status,
            }
        })
    }

    open_positions(sym1, sym2) {
        return this.private_endpoint(`open_positions/${sym1}/${sym2}/`).then(res => {
            return res.data.map(order => {
                return {
                    id: parseInt(order.id),
                    otime: moment(order.otime),
                    amount: parseFloat(order.amount)
                }
            })
        })
    }

    close_position(sym1, sym2, id) {
        return this.private_endpoint(`close_position/${sym1}/${sym2}/`).then(res => {
            return {
                id: parseInt(res.data.id),
                ctime: moment(res.data.ctime),
                ptype: res.data.ptype,
                price: parseFloat(res.data.price),
                profit: parseFloat(res.data.profit)
            }
        })
    }


    
    // internal methods ---------------------------------

    public_endpoint(endpoint, params = {}) {

        let path = `/${endpoint}`
        let params_str = Object.keys(params).map( key => `${key}=${params[key]}`).join('&')
        params_str = params_str.length ? '?'+params_str : ''

        let uri = `${this.config.url}${path}${params_str}`

        console.log(`GET ${uri}`)

        return request
            .get(uri)
            .type('application/json')
            .accept('text/json')
            .then( res => {
                return JSON.parse(res.text)
            })
            .catch( err => err.response ? err.response.text : err.status )
    }

    private_endpoint(endpoint, data = {}) {
        let nonce = Date.now().toString()
        
        let signature = crypto
            .createHmac('sha256', this.config.secret)
            .update(`${nonce}${this.config.userid}${this.config.key}`)
            .digest('hex')

        let body = Object.assign({}, {
            key: this.config.key,
            signature: signature,
            nonce: nonce
        }, 
        data)
        
        console.log(`POST ${this.config.url}/${endpoint}`)
        console.log(body)

        return request
            .post(`${this.config.url}/${endpoint}`)
            .type('json')
            .accept('text/json')
            .send(body)
            .then( res => {
                return JSON.parse(res.text)
            })
            .catch( err => err.response ? err.response.text : err.status )
    }

}


module.exports = Cex
