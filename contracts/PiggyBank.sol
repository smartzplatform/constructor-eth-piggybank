pragma solidity ^0.4.24;

import '../submodules/smartzplatform/solidity/contracts/ownership/multiowned.sol';

contract PiggyBank is multiowned {
	uint256 public NotBefore;

	function PiggyBank(address[] _owners, uint256 _threshold, uint256 _notBefore)
		public
		multiowned(_owners, _threshold)
	{
		NotBefore = _notBefore;
	}

	function() public payable {}

	function Withdraw(address toAddr, uint256 value) public onlymanyowners(keccak256(msg.data)) {
		require(getTime() >= NotBefore);
		toAddr.transfer(value);
	}

	function getTime() public view returns(uint256) {return now;}
}
