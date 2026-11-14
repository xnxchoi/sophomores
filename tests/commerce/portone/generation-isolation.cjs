// Preload for the existing Payload CLI: no environment files or sockets.
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { syncBuiltinESMExports } = require('node:module')
for (const method of ['readFileSync', 'readFile']) {
  const original = fs[method]
  fs[method] = function (target, ...args) {
    if (typeof target === 'string' && /^\.env(?:\.|$)/.test(path.basename(target))) {
      throw new Error('Environment-file read forbidden by I2 generation isolation')
    }
    return Reflect.apply(original, this, [target, ...args])
  }
}
const connect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  if (process.env.I2_ALLOW_LOOPBACK === '1') {
    const first = Array.isArray(args[0]) ? args[0][0] : args[0]
    const options = first && typeof first === 'object' ? first : undefined
    const host = options?.host ?? (typeof args[1] === 'string' ? args[1] : 'localhost')
    if (!options?.path && ['127.0.0.1', 'localhost', '::1'].includes(host)) return Reflect.apply(connect, this, args)
  }
  throw new Error('Non-isolated socket connection forbidden by I2 test isolation')
}
if (process.env.I2_ALLOW_LOOPBACK !== '1') globalThis.fetch = async () => { throw new Error('HTTP forbidden by I2 generation isolation') }
syncBuiltinESMExports()
