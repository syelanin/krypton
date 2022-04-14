const Emulator = require('../lib/exchange/emulator')
const emu = new Emulator()

emu.on('start', () => console.log('start'))
emu.on('bar', bar => console.log('bar'))
emu.on('stop', () => console.log('stop'))

emu.on('bar:1m', data => {
    console.log()
    console.log('1m:', data)
})

emu.on('bar:5m', bar => {
    console.log()
    console.log('5m:', bar)
})

emu.init()