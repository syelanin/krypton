
$(function () {
    run()
    ws_init()
})


let book = []
let trades = []
let ticker = []
let candles = []

let channel_book
let channel_trades
let channel_ticker
let channel_candles


function run() {

    zingchart.render({
        width: 500,
        height: 500,
        id: 'book',
        data: {
            type: 'hbar',
            title: {
                text: 'orderbook'
            },
            "plot": {
                "rules": [
                    {
                        "rule":"%v > 0",
                        "background-color":"#6c6"
                    },
                    {
                        "rule":"%v < 0",
                        "background-color":"#c00"
                    }
                ],
                "tooltip": {
                    "visible": false
                }
            },
            "crosshair-x": {
            },
            "crosshair-y": {
            },
            'scale-y': {
                //zooming: true,
                //'min-value': 6450,
                //'max-value': 6550
            },
            series: [
                {
                    values: []
                }
            ]
        },
        'auto-resize': true
    })


    zingchart.render({
        width: 500,
        height: 500,
        id: 'trades',
        data: {
            type: 'hbar',
            title: {
                text: 'trades'
            },
            "plot": {
                "rules": [
                    {
                        "rule":"%v > 0",
                        "background-color":"#6c6"
                    },
                    {
                        "rule":"%v < 0",
                        "background-color":"#c00"
                    }
                ],
                "tooltip": {
                    "visible": false
                }
            },
            "crosshair-x": {
            },
            "crosshair-y": {
            },
            'scale-y': {
                //zooming: true,
                //'min-value': 1300,
                //'max-value': 6500
            },
            series: [
                {
                    values: []
                }
            ]
        },
        'auto-resize': true
    })


    zingchart.render({
        width: 500,
        height: 500,
        id: 'ticker',
        data: {
            type: 'hbar',
            title: {
                text: 'ticker'
            },
            "plot": {
                "rules": [
                    {
                        "rule":"%v > 0",
                        "background-color":"#6c6"
                    },
                    {
                        "rule":"%v < 0",
                        "background-color":"#c00"
                    }
                ],
                "tooltip": {
                    "visible": false
                }
            },
            "crosshair-x": {
            },
            "crosshair-y": {
            },
            'scale-y': {
                //zooming: true,
                //'min-value': 6000,
                //'max-value': 7000
            },
            series: [
                {
                    values: []
                }
            ]
        },
        'auto-resize': true
    })


    zingchart.render({
        width: 700,
        height: 500,
        id: 'candles',
        data: {
            type: 'stock',
            title: {
                text: 'candles'
            },
            "plot": {
                "aspect": "candlestick",
                "trend-up": { //Stock Gain
                  "background-color": "green",
                  "line-color": "green",
                  "border-color": "green"
                },
                "trend-down": { //Stock Loss
                  "background-color": "red",
                  "line-color": "red",
                  "border-color": "red"
                },
                "trend-equal": { //No gain or loss
                  "background-color": "green",
                  "line-color": "green",
                  "border-color": "green"
                }
            },
            "scale-x": {
                //"min-value": 1420232400000,
                //"step": "second",
                /*"transform": {
                    "type": "date",
                    "all": "%H:%i"
                }*/
            },
            "scale-y": {
                "min-value": 5750,
                "max-value": 6250,
                //"values": "6400:6500:1",
                //"format": "$%v",
                /*"guide": {
                    "line-style": "solid"
                }*/
            },
            "crosshair-x": {
            },
            "crosshair-y": {
            },
            series: [
                {
                    values: []
                }
            ]
        },
        'auto-resize': true
    })

}


function is_event(res) {
    return !Array.isArray(res)
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



function ws_init() {

    const wss = new WebSocket('wss://api.bitfinex.com/ws/2');

    wss.addEventListener('open', function (event) {

        wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'book',
            pair: 'tBTCUSD',
            freq: 'F1',
            prec: 'P0'
        }))

        wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'trades',
            pair: 'tBTCUSD'
        }))

        wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'ticker',
            pair: 'tBTCUSD'
        }))

        wss.send(JSON.stringify({
            event: 'subscribe',
            channel: 'candles',
            key: `trade:1m:tBTCUSD`
        }))
    });

    wss.addEventListener('message', function (msg) {
        
        let data = JSON.parse(msg.data)

        if ( is_event(data) ) {
            if (data.channel == 'book')
                channel_book = data.chanId
            if (data.channel == 'trades')
                channel_trades = data.chanId
            if (data.channel == 'ticker')
                channel_ticker = data.chanId
            if (data.channel == 'candles')
                channel_candles = data.chanId
        }

        if ( is_snapshot(data) ) {

            if (data[0] == channel_book) {

                data[1].forEach(order => {
                    let price = order[0]
                    let amount = order[2]
                    let count = order[1]
                    
                    book.push({price: price, amount: amount, count: count})
                })
                
                print_book(book)

                zingchart.exec('book', 'setseriesvalues', {
                    plotindex:0,
                    values: book.map(item => [item.price, item.amount])
                })
            }

            if (data[0] == channel_trades) {
                
                data[1].forEach(trade => {
                    let time = moment(trade[1])
                    let price = trade[3]
                    let amount = trade[2]
                    
                    trades.push({time: time, price: price, amount: amount})
                })

                while (trades.length >= 25) {
                    trades.shift()
                }

                print_trades(trades)

                zingchart.exec('trades', 'setseriesvalues', {
                    plotindex:0,
                    values: trades.map(item => [item.price, item.amount])
                })
            }

            if (data[0] == channel_candles) {

                data[1].forEach(candle => {
                    let stamp = candle[0]
                    let open = candle[1]
                    let close = candle[2]
                    let high = candle[3]
                    let low = candle[4]
                    let volume = candle[5]
                    
                    candles.push({time: moment(stamp), stamp: stamp, open: open, close: close, high: high, low: low, volume: volume})
                })

                candles.sort((a,b) => {
                    if (moment(a.stamp).isBefore(moment(b.stamp)))
                        return -1
                    if (moment(a.stamp).isAfter(moment(b.stamp)))
                        return 1
                    if (moment(a.stamp).isSame(moment(b.stamp)))
                        return 0
                })

                candles = candles.slice(-25)
                
                print_candles(candles)

                zingchart.exec('candles', 'setseriesvalues', {
                    plotindex:0,
                    values: candles.map(item => [item.open, item.high, item.low, item.close])
                })
            }
            
        }

        if ( is_update(data) ) {
            
            if (data[0] == channel_book) {
                let order = data[1]

                let price = order[0]
                let amount = order[2]
                let count = order[1]

                if (count == 0) {
                    let index = book.findIndex(item => item.price == price && Math.sign(item.amount) == Math.sign(amount))
                    
                    if (index >= 0)
                        book.splice(index, 1)
                }

                if (count > 0) {
                    let index = book.findIndex(item => item.price == price && Math.sign(item.amount) == Math.sign(amount))
                    
                    if (index >= 0)
                        book[index] = {price: price, amount: amount, count: count}
                    else
                        book.push({price: price, amount: amount, count: count})
                }

                print_book(book)

                zingchart.exec('book', 'setseriesvalues', {
                    plotindex:0,
                    values: book.map(item => [item.price, item.amount])
                })

            }

            if (data[0] == channel_trades && data[1] == 'tu' ) {
                            
                let trade = data[2]

                let time = moment(trade[1])
                let price = trade[3]
                let amount = trade[2]

                while (trades.length >= 25) {
                    trades.shift()
                }
                    
                trades.push({time: time, price: price, amount: amount})

                print_trades(trades)

                zingchart.exec('trades', 'setseriesvalues', {
                    plotindex:0,
                    values: trades.map(item => [item.price, item.amount])
                })
                
            }

            if (data[0] == channel_ticker) {
                let row = data[1]

                let time = moment()
                let bid = row[0]
                let ask = row[2]
                let last_price = row[6]

                while (ticker.length >= 25) {
                    ticker.shift()
                }
                
                let delta = 0
                if (ticker.length) {
                    delta = Math.round((last_price - ticker[ticker.length-1].last_price)*10)/10 
                }

                ticker.push({time: time, bid: bid, ask: ask, last_price: last_price, delta: delta})

                print_ticker(ticker)

                zingchart.exec('ticker', 'setseriesvalues', {
                    plotindex:0,
                    values: ticker.map(item => [item.last_price, item.delta])
                })
                
            }

            if (data[0] == channel_candles) {

                let candle = data[1]
                
                let time = moment()
                let stamp = candle[0]
                let open = candle[1]
                let close = candle[2]
                let high = candle[3]
                let low = candle[4]
                let volume = candle[5]
                
                if (time.minutes() == moment(stamp).minutes()) {

                    let index = candles.findIndex(item => item.stamp == stamp)
                    
                    if (index >= 0)
                        candles[index] = {time: time, stamp: stamp, open: open, close: close, high: high, low: low, volume: volume}
                    else
                        candles.push({time: time, stamp: stamp, open: open, close: close, high: high, low: low, volume: volume})

                    while (candles.length > 25) {
                        candles.shift()
                    }
                    
                    print_candles(candles)

                    zingchart.exec('candles', 'setseriesvalues', {
                        plotindex:0,
                        values: candles.map(item => [item.open, item.high, item.low, item.close])
                    })
                }
                
            }
            
        }
        
    });

}



function print_book(data) {

    let buy_orders = []
    let sell_orders = []

    data.forEach(order => {
        if (order.amount > 0)
            buy_orders.push(order)
        else
            sell_orders.push(order)
    })

    buy_orders.sort((a,b) => b.price - a.price)
    sell_orders.sort((a,b) => a.price - b.price)

    let buy_table = ""
    let sell_table = ""

    buy_orders.forEach(order => {
        let amount = Math.round(order.amount*1000)/1000
        buy_table += `<tr ${amount >= 1 ? ' class="green"' : ''}> 
            <td>${order.price}</td> 
            <td ${amount >= 1 ? ' class="bold"' : ''}>${amount}</td> 
            <td>${order.count}</td> 
        </tr>\n`
    })
    
    sell_orders.forEach(order => {
        let amount = Math.round(order.amount*1000)/1000
        sell_table += `<tr ${Math.abs(amount) >= 1 ? ' class="red"' : ''}> 
            <td>${order.price}</td> 
            <td ${Math.abs(amount) >= 1 ? ' class="bold"' : ''}>${amount}</td> 
            <td>${order.count}</td> 
        </tr>\n`
    })

    $('#book_log').html(`
    <table>
    <tr>
        <td><b>SELL</b></td>
        <td><b>BUY</b></td>
    </tr>
    <tr>
        <td>
            <table>
            <tr> <td>Price</td> <td>Amount</td> <td>Count</td> </tr>
                ${sell_table}
            </table>
        </td>
        <td>
            <table>
            <tr> <td>Price</td> <td>Amount</td> <td>Count</td> </tr>
                ${buy_table}
            </table>
        </td>
    </tr>
    </table>
    `)

}


function print_trades(data) {

    let rows = []

    data.forEach(trade => {
        rows.push(Object.assign({}, trade))
    })

    rows.sort((a,b) => {
        if (b.time.isBefore(a.time))
            return -1
        if (b.time.isAfter(a.time))
            return 1
        if (b.time.isSame(a.time))
            return 0
    })

    let trades_table = ""

    rows.forEach(trade => {
        let amount = Math.round(trade.amount*1000)/1000
        trades_table += `<tr ${trade.amount > 0 ? ' class="green"' : ' class="red"'}> 
            <td>${trade.time.format('HH:mm:ss')}</td> 
            <td>${trade.amount < 0 ? trade.price : ''}</td> 
            <td ${trade.amount < 0 && Math.abs(amount) >= 1 ? ' class="bold"' : ''}>${trade.amount < 0 ? amount : ''}</td> 
            <td>${trade.amount > 0 ? trade.price : ''}</td> 
            <td ${trade.amount > 0 && amount >= 1 ? ' class="bold"' : ''}>${trade.amount > 0 ? amount : ''}</td> 
        </tr>\n`
    })

    $('#trades_log').html(`
    <table>
        <tr> <td></td> <td colspan="2"><b>SELL</b></td> <td colspan="2"><b>BUY</b></td> </tr>
        <tr> <td>Time</td> <td>Price</td> <td>Amount</td> <td>Price</td> <td>Amount</td> </tr>
        ${trades_table}
    </table>
    `)

}


function print_ticker(data) {

    if ( !data.length ) return 

    let rows = []

    data.forEach(row => {
        rows.push(Object.assign({}, row))
    })

    rows.sort((a,b) => {
        if (b.time.isBefore(a.time))
            return -1
        if (b.time.isAfter(a.time))
            return 1
        if (b.time.isSame(a.time))
            return 0
    })

    let ticker_table = ""

    rows.forEach(row => {
        let row_class
        if (row.delta > 0 ) row_class = ' class="green"'
        if (row.delta < 0 ) row_class = ' class="red"'

        ticker_table += `<tr ${row_class}> 
            <td>${row.time.format('HH:mm:ss')}</td> 
            <td>${row.ask}</td> 
            <td>${row.bid}</td> 
            <td>${Math.round((row.ask - row.bid)*100)/100}</td> 
            <td>${row.last_price}</td> 
            <td>${row.delta}</td> 
        </tr>\n`
    })

    $('#ticker_log').html(`
    <table>
        <tr> <td></td> <td><b>SELL</b></td> <td><b>BUY</b></td> <td></td> <td></td> <td></td> </tr>
        <tr> <td>Time</td> <td>Ask</td> <td>Bid</td> <td>Spread</td> <td>Last Price</td> <td>Price delta</td> </tr>
        ${ticker_table}
    </table>
    `)

}


function print_candles(data) {

    if ( !data.length ) return 

    let rows = []

    data.forEach(candle => {
        rows.push(Object.assign({}, candle))
    })

    rows.sort((a,b) => {
        if (b.time.isBefore(a.time))
            return -1
        if (b.time.isAfter(a.time))
            return 1
        if (b.time.isSame(a.time))
            return 0
    })

    let candles_table = ""

    rows.forEach((candle,i) => {
        let row_class
        if (candle.close - candle.open >= 0 ) row_class = ' class="green"'
        if (candle.close - candle.open < 0 ) row_class = ' class="red"'

        candles_table += `<tr ${row_class}> 
            <td>${rows.length-i-1}</td> 
            <td>${candle.time.format('HH:mm:ss')}</td> 
            <td>${moment(candle.stamp).format('HH:mm')}</td> 
            <td>${Math.round((candle.open)*100)/100}</td> 
            <td>${Math.round((candle.high)*100)/100}</td> 
            <td>${Math.round((candle.low)*100)/100}</td> 
            <td>${Math.round((candle.close)*100)/100}</td> 
            <td>${Math.round((candle.volume)*1000)/1000}</td> 
            <td>${Math.round( Math.abs(candle.close - candle.open) *10)/10}</td> 
            <td>${Math.round( Math.abs(candle.high - candle.low) *10)/10}</td> 
        </tr>\n`
    })

    $('#candles_log').html(`
    <table>
        <tr> <td></td> <td><b>1 min</b></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> <td></td> </tr>
        <tr> <td></td> <td>Time</td> <td>Stamp</td> <td>Open</td> <td>High</td> <td>Low</td> <td>Close</td> <td>Volume</td> <td>Body</td> <td>Height</td> </tr>
        ${candles_table}
    </table>
    `)

}

