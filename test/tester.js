const config = require('config')

const Exchange_Emulator_History = require('../lib/exchange/emulator_hist')
const WMA_Band_Strategy = require('../lib/strategy/trade/wma_band.trend')


class StrategyTester {

    constructor() {

    }


    run() {
        this.exchange = new Exchange_Emulator_History()
        let deposit = this.exchange.balances.usd
        
        //let exchange_config = config.get('exchange.emulator')
        //this.exchange.set_config(exchange_config)

        this.strategy = new WMA_Band_Strategy()
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


            let mid = this.strategy.mid_moves.map(move => {
                return {
                    dir: move.dir,
                    start: move.start,
                    stop: move.stop,
                    profit: Math.round( move.close.stop - move.close.start ),
                    max: Math.round( move.bars.map(c => c.high).reduce((a,b) => Math.max(a, b), 0) ),
                    min: Math.round( move.bars.map(c => c.low).reduce((a,b) => Math.min(a, b), 0) )
                }
            }).slice(0,-1)

            mid.forEach(move => {
                console.log(move)
            })

            let mid_profit = mid.reduce((sum,move) => sum + move.profit, 0)
            console.log('mid_profit', mid_profit)

        })

        this.exchange.start()
    }


    generate_configs() {
        // generate strategy params
    }

}

module.exports = StrategyTester