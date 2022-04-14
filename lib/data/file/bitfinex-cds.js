/*
https://www.cryptodatasets.com

BTCUSD, ETHUSD, LTCUSD, ETCUSD
1m, 15m, 1h, 6h, 1d

*/

const readline = require('readline')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const base_dir = path.join(__dirname,'../../../files/data')

const in_filename = 'Data Bitfinex BTCUSD Raw.csv'

let t_start, t_end

const rl = readline.createInterface({
  input: fs.createReadStream(path.join(base_dir, `${in_filename}`)),
  crlfDelay: Infinity,
  terminal: false
})



function save(timeframe) {

    t_start = moment()

    fs.writeFileSync(path.join(base_dir, `bitfinex-cds-${timeframe}.csv`), `time,open,high,low,close,volume\r\n`)

    let candles = []
    let cnt = 0

    rl.on('line', line => {

        cnt += 1

        //if (cnt > 500) return

        let tf = 1
    
        if (timeframe.includes('m'))
            tf = parseInt(timeframe.split('m')[0])

        if (timeframe.includes('h'))
            tf = parseInt(timeframe.split('h')[0])
        
        if (timeframe.includes('d'))
            tf = parseInt(timeframe.split('d')[0])

        
        let cols = line.split(',')
        
        if (cols[0] == 'timestamp') return
        
        let timestamp = moment.utc(cols[0])
        let amount = parseFloat(cols[1])
        let price = parseFloat(cols[2])


        let time = timestamp.clone()
        
        if (timeframe.includes('m')) {
            time.minutes( tf * Math.floor(time.minutes()/tf) )
            time.seconds(0)
            time.milliseconds(0)
        }
            
        if (timeframe.includes('h')) {
            time.hours( tf * Math.floor(time.hours()/tf) )
            time.minutes(0)
            time.seconds(0)
            time.milliseconds(0)
        }

        if (timeframe.includes('d')) {
            time.days( tf * Math.floor(time.days()/tf) )
            time.hours(0)
            time.minutes(0)
            time.seconds(0)
            time.milliseconds(0)
        }

        
        if ( !candles.length || !candles[candles.length-1].time.isSame(time) ) {
            candles.push({
                time: time,
                ticks: []
            })
            //fs.appendFileSync(path.join(base_dir, `bitfinex-cds-${timeframe}.csv`), `   ${time.format()}\r\n`)
        }
        
        candles[candles.length-1].ticks.push({
            amount: amount,
            price: price
        })


        //fs.appendFileSync(path.join(base_dir, `bitfinex-cds-${timeframe}.csv`), `${line}\r\n`)
        
    })

    rl.on('close', () => {

        candles.forEach(candle => {
            let bar = {
                time: candle.time,
                open: candle.ticks[0].price,
                high: candle.ticks.map(t => t.price).reduce((a,b) => Math.max(a, b)),
                low:  candle.ticks.map(t => t.price).reduce((a,b) => Math.min(a, b)),
                close: candle.ticks[candle.ticks.length-1].price,
                volume: candle.ticks.map(t => t.amount).reduce((sum,v) => sum + v)
            }
            let output = `${bar.time.format()},${bar.open},${bar.high},${bar.low},${bar.close},${bar.volume}\r\n`
            fs.appendFileSync(path.join(base_dir, `bitfinex-cds-${timeframe}.csv`), output)
        })
        
        t_end = moment()
        let t = t_end.diff(t_start, 'minutes')
        console.log('done in', t, 'min')
        console.log(`${cnt} lines`)
    })

}


function load(timeframe='1h') {

    let csv = fs.readFileSync(path.join(base_dir, `bitfinex-cds-${timeframe}.csv`), {encoding:'utf8'})

    return csv.split('\r\n').slice(1).map(line => {
        let cols = line.split(',')
        return {
            time: moment.utc(cols[0]),
            open: parseFloat(cols[1]),
            high: parseFloat(cols[2]),
            low: parseFloat(cols[3]),
            close: parseFloat(cols[4]),
            volume: parseFloat(cols[5])
        }
    })

}


module.exports = {
    load: load,
    save: save
}