// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiptxCore} from "../interfaces/IReceiptxCore.sol";

/// @title StakingTier
/// @notice AIA staking + tier multipliers (Bronze/Silver/Gold/Premium).
/// @dev This module only handles staking accounting + tier computation. AIA moves
/// between liquid and staked via ReceiptxCore.
contract StakingTier {
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

    // Tier requirements (in AIA units, no decimals)
    uint256 public constant TIER_BRONZE_REQUIREMENT = 0;
    uint256 public constant TIER_SILVER_REQUIREMENT = 100;
    uint256 public constant TIER_GOLD_REQUIREMENT = 1_000;
    uint256 public constant TIER_PREMIUM_REQUIREMENT = 10_000;

    struct StakingPosition {
        uint256 stakedAia;
        string tier;
        uint256 tierMultiplier; // ×10 precision (10 = 1.0x, 15 = 1.5x)
        uint256 lastUpdated;
    }

    mapping(address => StakingPosition) public positions;

    event AIAStaked(address indexed user, uint256 amount, uint256 newTotalStaked, string tier, uint256 tierMultiplier);
    event AIAUnstaked(address indexed user, uint256 amount, uint256 newTotalStaked, string tier, uint256 tierMultiplier);

    function _calculateTier(uint256 staked) internal pure returns (string memory tier, uint256 mult) {
        if (staked >= TIER_PREMIUM_REQUIREMENT) {
            return ("Premium", 15);
        } else if (staked >= TIER_GOLD_REQUIREMENT) {
            return ("Gold", 13);
        } else if (staked >= TIER_SILVER_REQUIREMENT) {
            return ("Silver", 11);
        } else {
            return ("Bronze", 10);
        }
    }

    /// @notice Stake AIA (user calls directly).
    function stakeAia(uint256 amount) external {
        require(amount > 0, "Zero amount");
        address user = msg.sender;

        // Move AIA from liquid balance into stake (core checks balances)
        core.moveAiaIntoStake(user, amount);

        StakingPosition storage pos = positions[user];
        uint256 newStaked = pos.stakedAia + amount;

        (string memory tierStr, uint256 mult) = _calculateTier(newStaked);

        pos.stakedAia = newStaked;
        pos.tier = tierStr;
        pos.tierMultiplier = mult;
        pos.lastUpdated = block.timestamp;

        emit AIAStaked(user, amount, newStaked, tierStr, mult);
    }

    /// @notice Unstake AIA back to liquid balance.
    function unstakeAia(uint256 amount) external {
        require(amount > 0, "Zero amount");
        address user = msg.sender;

        StakingPosition storage pos = positions[user];
        require(pos.stakedAia >= amount, "Insufficient staked AIA");

        uint256 newStaked = pos.stakedAia - amount;
        pos.stakedAia = newStaked;

        (string memory tierStr, uint256 mult) = _calculateTier(newStaked);
        pos.tier = tierStr;
        pos.tierMultiplier = mult;
        pos.lastUpdated = block.timestamp;

        // Move AIA back to liquid balance via core
        core.moveAiaOutOfStake(user, amount);

        emit AIAUnstaked(user, amount, newStaked, tierStr, mult);
    }

    /// @notice View helper for dashboards.
    function getUserTier(address user) external view returns (string memory tier, uint256 mult, uint256 staked) {
        StakingPosition storage pos = positions[user];
        return (pos.tier, pos.tierMultiplier, pos.stakedAia);
    }
}
