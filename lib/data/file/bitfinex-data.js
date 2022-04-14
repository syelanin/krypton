const moment = require('moment')
const fs = require('fs')
const path = require('path')

const Bitfinex = require('../../exchange/bitfinex')
const bitfinex = new Bitfinex()


function save(timeframe, limit=1000, start=null, end=null) {
    //let start = moment('2018-01-08 08:00')
    //let end   = moment('2018-01-08 23:55')
   
    return bitfinex.candles('btcusd', timeframe, limit, start, end)
        .then( data => {
            let csv = data
                .reverse()
                .map( bar => `${bar.time.format()},${bar.open},${bar.high},${bar.low},${bar.close},${bar.volume}` )
                .join('\r\n')

            fs.writeFileSync(path.join(__dirname, `../../../files/data/bitfinex_${timeframe}.csv`), csv)
            console.log(`${data.length} bars`)
        })
}


function load(timeframe) {

    let csv = fs.readFileSync(path.join(__dirname, `../../../files/data/bitfinex_${timeframe}.csv`), {encoding:'utf8'})

    return csv.split('\r\n').map(line => {
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
}


module.exports = {
    save: save,
    load: load
}