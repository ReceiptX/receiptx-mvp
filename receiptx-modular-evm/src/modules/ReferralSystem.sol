// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiptxCore} from "../interfaces/IReceiptxCore.sol";

/// @title ReferralSystem
/// @notice Awards AIA to referrers when a referred user completes their first valid receipt.
contract ReferralSystem {
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

    // AIA bonuses
    uint256 public constant REFERRAL_BONUS_BASE = 5;
    uint256 public constant REFERRAL_BONUS_MULTIPLIER = 10;

    mapping(bytes32 => bool) public referralProcessed; // referralHash => processed

    struct ReferralBonus {
        address referrer;
        address referred;
        uint256 aiaBonus;
        bool isMultiplierBrand;
        uint256 timestamp;
    }

    mapping(address => ReferralBonus[]) public userReferrals; // referrer => bonuses

    event ReferralProcessed(
        address indexed referrer,
        address indexed referred,
        bytes32 indexed referralHash,
        uint256 aiaBonus,
        bool isMultiplierBrand,
        uint256 timestamp
    );

    /// @notice Process referral bonus for a completed first receipt.
    /// @param referrer Referring user.
    /// @param referred Referred user.
    /// @param referralHash Unique hash for this referral event.
    /// @param isMultiplierBrand True if first receipt was from Starbucks/McD/CircleK.
    /// @param timestamp Event timestamp.
    function processReferralBonus(
        address referrer,
        address referred,
        bytes32 referralHash,
        bool isMultiplierBrand,
        uint256 timestamp
    ) external onlyOwner {
        require(referrer != address(0) && referred != address(0), "Invalid address");
        require(referrer != referred, "Self referral");
        require(!referralProcessed[referralHash], "Referral already processed");

        uint256 bonus = isMultiplierBrand ? REFERRAL_BONUS_MULTIPLIER : REFERRAL_BONUS_BASE;

        // Mint AIA via core
        core.mintAiaFromReferral(referrer, bonus);

        referralProcessed[referralHash] = true;

        ReferralBonus memory rb = ReferralBonus({
            referrer: referrer,
            referred: referred,
            aiaBonus: bonus,
            isMultiplierBrand: isMultiplierBrand,
            timestamp: timestamp
        });

        userReferrals[referrer].push(rb);

        emit ReferralProcessed(referrer, referred, referralHash, bonus, isMultiplierBrand, timestamp);
    }

    function getReferralCount(address referrer) external view returns (uint256) {
        return userReferrals[referrer].length;
    }
}
