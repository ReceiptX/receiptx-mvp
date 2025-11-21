// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Receiptx Registry
/// @notice Stores receipt metadata and per-user receipt lists for analytics and UX.
/// @dev Does NOT mint tokens. Only trusted modules (ReceiptProcessor/owner) should write here.
contract Registry {
    address public owner;
    address public receiptProcessor;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyReceiptProcessor() {
        require(msg.sender == receiptProcessor || msg.sender == owner, "Not receipt processor");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    function setReceiptProcessor(address module) external onlyOwner {
        receiptProcessor = module;
    }

    struct ReceiptMetadata {
        uint256 amountCents;
        string brand;       // lowercase slug
        uint256 multiplier; // ×10 precision (10 = 1.0x)
        uint256 rwtEarned;
        string platform;    // "ocr", "shopify", etc.
        uint256 timestamp;
    }

    mapping(bytes32 => ReceiptMetadata) public receiptMetadata;
    mapping(address => bytes32[]) public userReceipts;

    event ReceiptStored(
        address indexed user,
        bytes32 indexed receiptHash,
        uint256 amountCents,
        string brand,
        uint256 multiplier,
        uint256 rwtEarned,
        string platform,
        uint256 timestamp
    );

    function storeReceipt(
        address user,
        bytes32 receiptHash,
        uint256 amountCents,
        string calldata brand,
        uint256 multiplier,
        uint256 rwtEarned,
        string calldata platform,
        uint256 timestamp
    ) external onlyReceiptProcessor {
        require(user != address(0), "Invalid user");
        // overwrite is allowed if hash reused in a test environment, but on-chain
        // anti-fraud should prevent it. Registry itself is not opinionated.
        receiptMetadata[receiptHash] = ReceiptMetadata({
            amountCents: amountCents,
            brand: brand,
            multiplier: multiplier,
            rwtEarned: rwtEarned,
            platform: platform,
            timestamp: timestamp
        });
        userReceipts[user].push(receiptHash);

        emit ReceiptStored(user, receiptHash, amountCents, brand, multiplier, rwtEarned, platform, timestamp);
    }

    function getUserReceiptCount(address user) external view returns (uint256) {
        return userReceipts[user].length;
    }
}
