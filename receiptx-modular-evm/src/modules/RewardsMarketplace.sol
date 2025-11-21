// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReceiptxCore} from "../interfaces/IReceiptxCore.sol";

/// @title RewardsMarketplace
/// @notice Burns RWT when users redeem rewards. Off-chain system delivers actual perks.
contract RewardsMarketplace {
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

    event RewardRedeemed(address indexed user, uint256 rwtAmount, string rewardId);

    /// @notice Redeem a reward by burning RWT.
    /// @param user The user redeeming.
    /// @param rwtAmount Amount of RWT to burn.
    /// @param rewardId Off-chain ID / SKU for the reward.
    function redeemReward(address user, uint256 rwtAmount, string calldata rewardId) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(rwtAmount > 0, "Zero RWT");

        core.burnRwtForReward(user, rwtAmount);

        emit RewardRedeemed(user, rwtAmount, rewardId);
    }
}
