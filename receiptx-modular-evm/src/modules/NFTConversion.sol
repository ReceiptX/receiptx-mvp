// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiptxCore} from "../interfaces/IReceiptxCore.sol";

/// @title NFTConversion
/// @notice Converts loyalty NFTs into AIA balances and logs conversions.
contract NFTConversion {
    IReceiptxCore public core;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(IReceiptxCore _core) {
        owner = msg.sender;
        core = _core;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    struct NFTConversionEvent {
        string nftType;
        uint256 aiaValue;
        uint256 timestamp;
    }

    mapping(address => NFTConversionEvent[]) public conversions;

    event NFTConverted(address indexed user, string nftType, uint256 aiaValue, uint256 timestamp);

    /// @notice Convert an NFT into AIA tokens.
    /// @dev Off-chain system should handle actual NFT burning/locking; this is just the AIA leg.
    function convertNftToAia(
        address user,
        string calldata nftType,
        uint256 aiaValue,
        uint256 timestamp
    ) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(aiaValue > 0, "Zero AIA value");

        // Mint AIA via core
        core.mintAiaFromNft(user, aiaValue);

        conversions[user].push(
            NFTConversionEvent({nftType: nftType, aiaValue: aiaValue, timestamp: timestamp})
        );

        emit NFTConverted(user, nftType, aiaValue, timestamp);
    }

    function getConversionCount(address user) external view returns (uint256) {
        return conversions[user].length;
    }
}
