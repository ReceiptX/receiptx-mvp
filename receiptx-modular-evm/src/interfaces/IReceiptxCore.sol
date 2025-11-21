// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReceiptxCore
/// @notice Minimal interface for the ReceiptxCore ledger used by modules.
interface IReceiptxCore {
    // --- Read views ---

    function rwtBalance(address user) external view returns (uint256);
    function aiaBalance(address user) external view returns (uint256);
    function aiaStaked(address user) external view returns (uint256);
    function aiaMinted() external view returns (uint256);
    function isReceiptUsed(bytes32 receiptHash) external view returns (bool);

    // --- Module-only mutating functions ---

    // Receipt processor
    function markReceiptUsed(bytes32 receiptHash) external;
    function mintRwtFromReceipt(address to, uint256 amount) external;

    // Rewards marketplace
    function burnRwtForReward(address from, uint256 amount) external;

    // Referral
    function mintAiaFromReferral(address to, uint256 amount) external;

    // NFT conversions
    function mintAiaFromNft(address to, uint256 amount) external;

    // Staking
    function moveAiaIntoStake(address user, uint256 amount) external;
    function moveAiaOutOfStake(address user, uint256 amount) external;

    // --- Owner / admin (for emergency/manual ops) ---

    function mintRwt(address to, uint256 amount) external;
    function burnRwt(address from, uint256 amount) external;
    function mintAia(address to, uint256 amount) external;
    function burnAia(address from, uint256 amount) external;

    // --- View helpers ---

    function getSystemStats() external view returns (
        uint256 receipts,
        uint256 rwtMinted,
        uint256 rwtBurned,
        uint256 aiaMintedTotal,
        uint256 aiaBurnedTotal,
        uint256 nftConversions,
        uint256 referrals
    );
}
