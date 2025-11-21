// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiptxCore} from "../interfaces/IReceiptxCore.sol";
import {Registry} from "./Registry.sol";

/// @title ReceiptProcessor
/// @notice Applies brand multipliers, calculates RWT rewards, and logs metadata.
contract ReceiptProcessor {
    IReceiptxCore public core;
    Registry public registry;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(IReceiptxCore _core, Registry _registry) {
        owner = msg.sender;
        core = _core;
        registry = _registry;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    // Brand multipliers (×10 precision)
    uint256 public constant MULTIPLIER_STARBUCKS = 15; // 1.5x
    uint256 public constant MULTIPLIER_MCDONALDS = 15; // 1.5x
    uint256 public constant MULTIPLIER_CIRCLEK = 15;   // 1.5x
    uint256 public constant MULTIPLIER_BASE = 10;      // 1.0x

    uint256 public constant BASE_RWT_PER_DOLLAR = 1;

    event ReceiptProcessed(
        address indexed user,
        bytes32 indexed receiptHash,
        uint256 amountCents,
        string brand,
        uint256 multiplier,
        uint256 rwtEarned,
        string platform,
        uint256 timestamp
    );

    function _brandHash(string memory brand) internal pure returns (bytes32) {
        return keccak256(bytes(brand));
    }

    function _getBrandMultiplier(string memory brand) internal pure returns (uint256) {
        bytes32 h = _brandHash(brand);
        if (h == keccak256("starbucks")) return MULTIPLIER_STARBUCKS;
        if (h == keccak256("mcdonalds")) return MULTIPLIER_MCDONALDS;
        if (h == keccak256("circlek") || h == keccak256("circle_k")) return MULTIPLIER_CIRCLEK;
        return MULTIPLIER_BASE;
    }

    /// @notice Process a receipt and mint RWT.
    /// @param user Wallet receiving RWT.
    /// @param receiptHash keccak256 of canonical receipt JSON.
    /// @param amountCents Receipt total in cents.
    /// @param brand Lowercase slug, e.g. "starbucks".
    /// @param platform "ocr", "shopify", "square", etc.
    /// @param timestamp Unix timestamp.
    function processReceipt(
        address user,
        bytes32 receiptHash,
        uint256 amountCents,
        string calldata brand,
        string calldata platform,
        uint256 timestamp
    ) external onlyOwner {
        require(!core.isReceiptUsed(receiptHash), "Receipt already used");
        require(user != address(0), "Invalid user");

        uint256 multiplier = _getBrandMultiplier(brand);

        uint256 dollars = amountCents / 100;
        uint256 rwtBase = dollars * BASE_RWT_PER_DOLLAR;
        uint256 rwtEarned = (rwtBase * multiplier) / 10;

        // Mark hash used & mint in core
        core.markReceiptUsed(receiptHash);
        if (rwtEarned > 0) {
            core.mintRwtFromReceipt(user, rwtEarned);
        }

        // Store metadata in Registry
        registry.storeReceipt(user, receiptHash, amountCents, brand, multiplier, rwtEarned, platform, timestamp);

        emit ReceiptProcessed(user, receiptHash, amountCents, brand, multiplier, rwtEarned, platform, timestamp);
    }
}
