'use strict';

import expectThrow from '../node_modules/openzeppelin-solidity/test/helpers/expectThrow';
import expectEvent from '../node_modules/openzeppelin-solidity/test/helpers/expectEvent';

const BigNumber = web3.BigNumber;
const chai =require('chai');
chai.use(require('chai-bignumber')(BigNumber));
chai.use(require('chai-as-promised')); // Order is important
chai.should();

const PiggyBank = artifacts.require("PiggyBank");
const MockPiggyBank = artifacts.require("MockPiggyBank");

// Helpers 
function daysInFutureTimestamp(days) {
	const now = new Date();
	const futureDate = new Date(+now + 86400 * days);
	return Math.trunc(futureDate.getTime()/1000);
}

async function assertBalanceDiff(callInfo, wantEtherDiff, watchList = {}) {
	if (typeof(watchList) !== "object") watchList = {};
	const etherBefore = web3.eth.getBalance(callInfo.address);
	let history = {};
	Reflect.ownKeys(watchList).forEach(addr => {
		history[addr] = {before: new BigNumber(web3.eth.getBalance(addr)), wantDiff: watchList[addr],};
	});

	const gasPrice = 'gasPrice' in callInfo ? callInfo.gasPrice : 10;
	const ret = await callInfo.func(...callInfo.args, {from: callInfo.address, gasPrice});
	const gasUsed = new BigNumber(ret.receipt.gasUsed);

	const etherAfter = web3.eth.getBalance(callInfo.address);
	const etherUsed = gasUsed.mul(gasPrice);
	etherAfter.sub(etherBefore).add(etherUsed).should.be.bignumber.equal(wantEtherDiff);

	Reflect.ownKeys(history).forEach(addr => {
		let diff = (new BigNumber(web3.eth.getBalance(addr))).sub(history[addr].before);
		if (addr === callInfo.address) {
			diff = diff.add(etherUsed);
		}
		diff.should.be.bignumber.equal(history[addr].wantDiff);
	});
}

contract('PiggyBank', function(accounts) {
	const acc = {anyone: accounts[0], owner1: accounts[1], owner2: accounts[2], nobody: accounts[4]};

	it('construct piggybank owned by two accounts, send ether and send it out with two confirmations', async function() {
		this.inst = await PiggyBank.new([acc.owner1, acc.owner2], 2, 0, {from: acc.anyone});
		await this.inst.sendTransaction({from: acc.owner1, value: web3.toWei('200', 'finney')});
		await this.inst.sendTransaction({from: acc.owner2, value: web3.toWei('300', 'finney')});
		web3.eth.getBalance(this.inst.address).should.be.bignumber.equal(web3.toWei('500', 'finney'));

		const callerBalanceDiff = 0;
		const transferAmount = new BigNumber(web3.toWei('100', 'finney'));

		const callInfo1 = {func: this.inst.Withdraw, args: [acc.anyone, transferAmount], address: acc.owner1};
		const expectedBalanceDiff1 = {[acc.anyone] : 0};
		await assertBalanceDiff(callInfo1, callerBalanceDiff, expectedBalanceDiff1);

		const callInfo2 = {func: this.inst.Withdraw, args: [acc.anyone, transferAmount], address: acc.owner2};
		const expectedBalanceDiff2 = {[acc.anyone] : transferAmount};
		await assertBalanceDiff(callInfo2, callerBalanceDiff, expectedBalanceDiff2);
	});

	it('should remember NotBefore timestamp when passed into constructor', async function() {
		const ts = daysInFutureTimestamp(3);
		this.inst = await PiggyBank.new([acc.owner1, acc.owner2], 2, ts, {from: acc.anyone});
		this.inst.NotBefore({from: acc.anyone}).should.be.eventually.bignumber.equal(ts);
	});

	it('should not withdraw before timestamp', async function() {
		const ts = daysInFutureTimestamp(3);
		const etherAmount = web3.toWei('200', 'finney');
		this.inst = await PiggyBank.new([acc.owner1], 1, ts, {from: acc.anyone});
		await this.inst.sendTransaction({from: acc.owner1, value: etherAmount});

		await expectThrow(this.inst.Withdraw(acc.anyone, etherAmount, {from: acc.owner1}));
	});

	it('should successfully withdraw if now == NotBefore timestamp', async function() {
		const ts = daysInFutureTimestamp(3);
		const etherAmount = web3.toWei('200', 'finney');
		this.inst = await MockPiggyBank.new([acc.owner1, acc.owner2], 1, ts, {from: acc.anyone});
		await this.inst.sendTransaction({from: acc.owner1, value: etherAmount});
		await this.inst.setTime(ts, {from: acc.owner1}).should.be.eventually.fulfilled;
		await this.inst.getTime({from: acc.owner1}).should.be.eventually.bignumber.equal(ts);

		const callInfo = {func: this.inst.Withdraw, args: [acc.anyone, etherAmount], address: acc.owner1};
		const expectedBalanceDiff = {[acc.anyone] : etherAmount};
		await assertBalanceDiff(callInfo, 0, expectedBalanceDiff);
	});

	it('should successfully withdraw after NotBefore timestamp is reached', async function() {
		const borderTs = daysInFutureTimestamp(3);
		const ts2 = (new BigNumber(borderTs)).add(1);
		const etherAmount = web3.toWei('200', 'finney');
		this.inst = await MockPiggyBank.new([acc.owner1, acc.owner2], 1, borderTs, {from: acc.anyone});
		await this.inst.sendTransaction({from: acc.owner1, value: etherAmount});
		await this.inst.setTime(ts2, {from: acc.owner1}).should.be.eventually.fulfilled;
		await this.inst.getTime({from: acc.owner1}).should.be.eventually.bignumber.equal(ts2);

		const callInfo = {func: this.inst.Withdraw, args: [acc.anyone, etherAmount], address: acc.owner1};
		const expectedBalanceDiff = {[acc.anyone] : etherAmount};
		await assertBalanceDiff(callInfo, 0, expectedBalanceDiff);
	});

});
