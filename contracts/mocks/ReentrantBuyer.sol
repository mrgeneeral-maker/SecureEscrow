// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SecureEscrow} from "../SecureEscrow.sol";

/// @title ReentrantBuyer
/// @notice Buyer that tries to re-enter SecureEscrow.claimRefund() when its refund arrives.
/// @dev Test helper only.
contract ReentrantBuyer {
    SecureEscrow public immutable escrow;

    uint256 public targetId;
    bool public attempted;
    bool public reentered;

    constructor(SecureEscrow _escrow) {
        escrow = _escrow;
    }

    function open(address seller, uint64 amountKobo, uint64 window) external payable {
        targetId = escrow.createEscrow{value: msg.value}(seller, amountKobo, window);
    }

    function claim() external {
        escrow.claimRefund(targetId);
    }

    receive() external payable {
        if (attempted) return;
        attempted = true;
        try escrow.claimRefund(targetId) {
            reentered = true;
        } catch {}
    }
}
