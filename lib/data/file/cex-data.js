const moment = require('moment')
const fs = require('fs')
const path = require('path')

const Cex = require('../../exchange/cex')
const cex = new Cex()

const base_dir = path.join(__dirname,'../../../files/data')


function save(timeframe) {
    
    let date = moment().subtract(1, 'days')
    let date_str = date.format('YYYY-MM-DD')
    
    return cex.candles('BTC','USD', date)
        .then( data => {
            let csv = data[timeframe]
                .map( bar => `${bar.time.format()},${bar.open},${bar.high},${bar.low},${bar.close},${bar.volume}` )
                .join('\r\n')

            fs.writeFileSync(path.join(base_dir, `cex_${timeframe}_${date_str}.csv`), 'time,open,high,low,close,volume\r\n')
            fs.appendFileSync(path.join(base_dir, `cex_${timeframe}_${date_str}.csv`), csv)
            console.log(`${data[timeframe].length} bars`)
        })
}


function load(timeframe='5m') {

    let csv_1m = fs.readFileSync(path.join(base_dir, `cex_1m.csv`), {encoding:'utf8'})

    let data_1m = csv_1m.split('\r\n').slice(1).map(line => {
            let cols = line.split(',')
            return {
                time: moment(cols[0]),
                open: parseFloat(cols[1]),
                high: parseFloat(cols[2]),
                low: parseFloat(cols[3]),
                close: parseFloat(cols[4]),
                volume: parseFloat(cols[5])
            }
        })
    
    let tf = 5
    
    if (timeframe.includes('m'))
        tf = parseInt(timeframe.split('m')[0])
    if (timeframe.includes('h'))
        tf = parseInt(timeframe.split('h')[0])

    let candles = []

    
    // atomic timeframe, fill in missing data

    if (timeframe == '1m') {

        data_1m.forEach(bar => {
            
            if ( !candles.length ) {
                candles.push({
                    time: bar.time.clone(),
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume
                })
                return
            }

            let last = candles[candles.length-1]
            let time = last.time.clone().add(1, 'minute')

            if ( !time.isSame(bar.time) ) {
                
                while ( time.isBefore(bar.time) ) {
                    candles.push({
                        time: time,
                        open: last.close,
                        high: last.close,
                        low: last.close,
                        close: last.close,
                        volume: 0
                    })
                    time = time.clone().add(1, 'minute')
                }

            }
            
            if ( time.isSame(bar.time) ) {
                candles.push({
                    time: time,
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume
                })
            }
        })

        return candles

    }

    
    // cases other than 1m

    data_1m.forEach(bar => {

        let time = bar.time.clone()
        
        if (timeframe.includes('m'))
            time.minutes( tf * Math.floor(time.minutes()/tf) )
        if (timeframe.includes('h')) {
            time.hours( tf * Math.floor(time.hours()/tf) )
            time.minutes(0)
        }
        
        if ( !candles.length || !candles[candles.length-1].time.isSame(time) ) {
            candles.push({
                time: time,
                bars: []
            })
        }
        
        candles[candles.length-1].bars.push(bar)

    })

    return candles.map(candle => {
        return {
            time: candle.time,
            open: candle.bars[0].open,
            high: candle.bars.map(c => c.high).reduce((a,b) => Math.max(a, b)),
            low:  candle.bars.map(c => c.low).reduce((a,b) => Math.min(a, b)),
            close: candle.bars[candle.bars.length-1].close,
            volume: candle.bars.map(c => c.volume).reduce((sum,v) => sum + v)
        }
    })

}


module.exports = {
    save: save,
    load: load
}