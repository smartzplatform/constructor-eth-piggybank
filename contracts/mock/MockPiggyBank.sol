pragma solidity ^0.4.24;

import '../PiggyBank.sol';

contract MockPiggyBank is  PiggyBank {
	constructor(address[] _owners, uint256 _threshold, uint256 _notBefore)
		public PiggyBank(_owners, _threshold, _notBefore) { }

	uint256 public _time;
	function getTime() public view returns (uint256) {
		if (_time > 0) {
			return _time;
		}
		return now;
	}
	function setTime(uint256 _val) public {
		 _time = _val;
	}
}
