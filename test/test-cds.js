const config = require('config')

const Exchange_Emulator_History = require('../lib/exchange/emulator_hist')
//const Strategy = require('../lib/strategy/trade/wma_band.trend')
const Strategy = require('../lib/strategy/trade/level.trend')


class StrategyTester {

    constructor() {

    }


    run() {
        this.exchange = new Exchange_Emulator_History()
        let deposit = this.exchange.balances.usd
        
        //let exchange_config = config.get('exchange.emulator')
        //this.exchange.set_config(exchange_config)

        this.strategy = new Strategy()
        this.strategy.set_exchange(this.exchange)
        
        //let strategy_configs = generate_configs()
        
        
        this.exchange.on('start', () => {
            //let strategy_config = config.get('strategy.trend.ma_only')
            //this.strategy.set_config(strategy_config)
            console.log('exchange.start')
        })

        this.exchange.on('stop', () => {
            // save exchange balance

            //if ( strategy_configs.values().next() )
            //    this.exchange.start()
            console.log('exchange.stop')

            //console.log('profit:', Math.round(this.exchange.balances.usd/deposit*100-100), '%' )

            //console.log(this.strategy.big_moves)

            console.log('bars', this.strategy.bars.length)
            console.log('signals', this.strategy.signals.length)
            this.strategy.signals.slice(0,20).forEach(signal => console.log(signal))

            /*let moves = this.strategy.moves_up.map(move => {
                return {
                    dir: move.dir,
                    start: move.start.time,
                    stop: move.stop.time,
                    profit: Math.round( move.stop.price - move.start.price ),
                    max: Math.round( move.bars.map(c => c.high).reduce((a,b) => Math.max(a, b), 0) ),
                    min: Math.round( move.bars.map(c => c.low).reduce((a,b) => Math.min(a, b), 0) )
                }
            })

            moves.forEach(move => {
                console.log(move)
            })

            let profit_sum = moves.reduce((sum,move) => sum + move.profit, 0)
            let profit_limit = moves.map(c => c.max > 300 ? 300 : c.max).reduce((sum,c) => sum + c, 0)
            let max_sum = moves.reduce((sum,move) => sum + move.max, 0)
            let max_max = moves.map(c => c.max).reduce((a,b) => Math.max(a, b), 0)
            let max_min = moves.map(c => c.max).reduce((a,b) => Math.min(a, b), 0)
            
            console.log('profit sum:', profit_sum)
            console.log('profit limit:', profit_limit)
            console.log('max sum:', max_sum)
            console.log('max max:', max_max)*/
        })

        this.exchange.start()
    }


    generate_configs() {
        // generate strategy params
    }

}

module.exports = StrategyTester