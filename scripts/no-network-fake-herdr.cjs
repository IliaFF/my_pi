// Offline upstream Herdr tests need only their temporary fake Unix sockets.
const assert = require('node:assert/strict');
const net = require('node:net');
const { syncBuiltinESMExports } = require('node:module');
const originals = { connect: net.connect, createConnection: net.createConnection,
  socketConnect: net.Socket.prototype.connect, listen: net.Server.prototype.listen };
require('./no-network.cjs');
const allowed = path => typeof path === 'string' &&
  (/^\/tmp\/fake-herdr-[A-Za-z0-9]+\/herdr\.sock$/.test(path) || path === '/nonexistent/herdr.sock');
const wrap = fn => function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const path = typeof first === 'string' ? first : first?.path;
  if (!allowed(path)) throw new Error('NETWORK_BLOCKED: only fake Herdr Unix sockets are allowed');
  return fn.apply(this, args);
};
net.connect = wrap(originals.connect);
net.createConnection = wrap(originals.createConnection);
net.Socket.prototype.connect = wrap(originals.socketConnect);
net.Server.prototype.listen = wrap(originals.listen);
syncBuiltinESMExports();
assert.throws(() => net.connect(443, 'example.com'), /NETWORK_BLOCKED/);
assert.throws(() => net.connect({ path: '/tmp/real-herdr.sock' }), /NETWORK_BLOCKED/);
assert.throws(() => net.createServer().listen(8080), /NETWORK_BLOCKED/);
