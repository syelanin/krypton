class WMA {

    constructor(period) {
        this.period = period
        this.prices = []
        
        this.prev = 0
        this.cur = 0
    }


    add_price(price) {
        
        this.prices.push(price)

        this.prev = this.cur
        
        if (this.prices.length <= this.period) {
            this.cur = 0
            return
        }
        
        // WMA = (w1*close1 + w2*close2 + ... wN*closeN) / (1 + 2 + ... + N)
        // wn = 1,2,3,..,N

        let sum = 0
        let weights = 0
        let last_prices = this.prices.slice(-this.period)

        for (var k = 1; k <= this.period; k++) { 
            sum += last_prices[k-1] * k
            weights += k
        }
        
        this.cur = sum / weights
    }

}

module.exports = WMA