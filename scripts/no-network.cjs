// Guard mandatory Node smoke tests. Not an OS sandbox; native code/subprocesses need separate live checks.
const { syncBuiltinESMExports } = require("node:module");
const deny = () => {
  const error = new Error("NETWORK_BLOCKED: mandatory build tests must not use network");
  process.stderr.write(`${error.message}\n`);
  throw error;
};
globalThis.fetch = async () => deny();
for (const name of ["node:http", "node:https"]) {
  const module = require(name);
  module.request = module.get = deny;
}
const net = require("node:net");
net.connect = net.createConnection = deny;
syncBuiltinESMExports();
