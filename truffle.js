require('babel-register')({
  ignore: /node_modules\/(?!openzeppelin-solidity)/
});
require('babel-polyfill');

const localopts = require('./localopts.js');

// -------------------------------------------------------------------
// Emulate mocha --grep option to run only matching tests
let mochaConf = {}; // Passed as module.exports.mocha
// -------------------------------------------------------------------
for (let i = 0; i < process.argv.length; i++) {
	const arg = process.argv[i];
	if (arg != '-g' && arg != "--grep" ) continue;
	if (++i >= process.argv.length) {
		console.error(arg + " option requires argument");
		process.exit(1);
	};
	mochaConf.grep = new RegExp(process.argv[i]);
	break;
}
// -------------------------------------------------------------------

module.exports = {
	// See <http://truffleframework.com/docs/advanced/configuration>
	// to customize your Truffle configuration!
	networks: {
		development: {
			host: "127.0.0.1",
			port: 9545,
			network_id: "*" // match any network
		},
		rinkeby: {
			host: "localhost", // Connect to geth on the specified
			port: 8545,
			from: localopts.rinkeby.etheraddress,
			network_id: 4,
			gas: 4612388, // Gas limit used for deploys
		}
	},
};
