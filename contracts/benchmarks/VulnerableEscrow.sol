// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title VulnerableEscrow
/// @notice Benchmark contract that intentionally performs the external call before the state
///         update, exposing it to reentrancy (SWC-107).
/// @dev Exists only to demonstrate and measure the flaw. Must never be deployed to a public network.
contract VulnerableEscrow {
    struct Deal {
        address buyer;
        address seller;
        uint256 amount;
        bool released;
    }

    uint256 public dealCount;

    mapping(uint256 => Deal) public deals;

    function createEscrow(address seller) external payable returns (uint256 id) {
        require(msg.value > 0, "zero amount");
        id = dealCount++;
        deals[id] = Deal(msg.sender, seller, msg.value, false);
    }

    function release(uint256 id) external {
        Deal storage d = deals[id];
        require(msg.sender == d.buyer && !d.released, "invalid state");

        (bool ok, ) = d.seller.call{value: d.amount}("");
        require(ok, "transfer failed");

        d.released = true;
    }
}
