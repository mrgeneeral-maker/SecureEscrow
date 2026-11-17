// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title EtherRejecter
/// @notice Contract without a payable fallback, so every plain Ether transfer to it fails.
/// @dev Test helper only.
contract EtherRejecter {}
