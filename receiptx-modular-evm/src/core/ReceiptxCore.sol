// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title ReceiptxCore
/// @notice Core internal ledger for Receiptx:
/// - RWT balances (unlimited rewards)
/// - AIA balances (capped at 1B)
/// - Staked AIA balances
/// - Receipt hash anti-fraud registry
/// - Global statistics
///
/// This contract does not implement business logic.
/// Instead, external modules (ReceiptProcessor, ReferralSystem, etc.) call into it
/// through restricted functions. Module addresses can be updated by the owner to
/// "upgrade" logic without migrating balances.

contract ReceiptxCore is Ownable2Step, Pausable {
    // ------------------------------------------------------------------------
    // MODULE VERSION TRACKING
    // ------------------------------------------------------------------------
    mapping(address => uint256) public moduleVersions;

    // ------------------------------------------------------------------------
    // CONSTANTS
    // ------------------------------------------------------------------------
    uint256 public constant AIA_TOTAL_SUPPLY = 1_000_000_000; // 1B AIA units (no decimals)

    // ------------------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------------------
    event ModuleUpdated(string indexed moduleName, address oldAddress, address newAddress, uint256 version);
    event RwtMinted(address indexed user, uint256 amount, string source);
    event RwtBurned(address indexed user, uint256 amount, string source);
    event AiaMinted(address indexed user, uint256 amount, string source);
    event AiaBurned(address indexed user, uint256 amount, string source);
    event AiaStaked(address indexed user, uint256 amount);
    event AiaUnstaked(address indexed user, uint256 amount);
    event ReceiptMarkedUsed(bytes32 indexed receiptHash);

    // ------------------------------------------------------------------------
    // MODULE REGISTRY
    // ------------------------------------------------------------------------
    address public receiptProcessor;
    address public referralModule;
    address public stakingModule;
    address public nftModule;
    address public rewardsModule;

    modifier onlyReceiptProcessor() {
        require(msg.sender == receiptProcessor || msg.sender == owner, "Not receipt processor");
        _;
    }

    modifier onlyReferralModule() {
        require(msg.sender == referralModule || msg.sender == owner, "Not referral module");
        _;
    }

    modifier onlyStakingModule() {
        require(msg.sender == stakingModule || msg.sender == owner, "Not staking module");
        _;
    }

    modifier onlyNftModule() {
        require(msg.sender == nftModule || msg.sender == owner, "Not NFT module");
        _;
    }

    modifier onlyRewardsModule() {
        require(msg.sender == rewardsModule || msg.sender == owner, "Not rewards module");
        _;
    }

    // Owner-controlled wiring with version tracking
    function setReceiptProcessor(address module, uint256 version) external onlyOwner {
        require(module != address(0), "Invalid module address");
        address oldModule = receiptProcessor;
        receiptProcessor = module;
        moduleVersions[module] = version;
        emit ModuleUpdated("ReceiptProcessor", oldModule, module, version);
    }

    function setReferralModule(address module, uint256 version) external onlyOwner {
        require(module != address(0), "Invalid module address");
        address oldModule = referralModule;
        referralModule = module;
        moduleVersions[module] = version;
        emit ModuleUpdated("ReferralModule", oldModule, module, version);
    }

    function setStakingModule(address module, uint256 version) external onlyOwner {
        require(module != address(0), "Invalid module address");
        address oldModule = stakingModule;
        stakingModule = module;
        moduleVersions[module] = version;
        emit ModuleUpdated("StakingModule", oldModule, module, version);
    }

    function setNftModule(address module, uint256 version) external onlyOwner {
        require(module != address(0), "Invalid module address");
        address oldModule = nftModule;
        nftModule = module;
        moduleVersions[module] = version;
        emit ModuleUpdated("NFTModule", oldModule, module, version);
    }

    function setRewardsModule(address module, uint256 version) external onlyOwner {
        require(module != address(0), "Invalid module address");
        address oldModule = rewardsModule;
        rewardsModule = module;
        moduleVersions[module] = version;
        emit ModuleUpdated("RewardsModule", oldModule, module, version);
    }

    // ------------------------------------------------------------------------
    // STORAGE
    // ------------------------------------------------------------------------

    // Internal ledgers
    mapping(address => uint256) public rwtBalance;
    mapping(address => uint256) public aiaBalance;
    mapping(address => uint256) public aiaStaked; // total AIA staked per user (for bookkeeping)

    uint256 public aiaMinted; // total AIA minted to all users (liquid + staked)

    // Receipt hashes (anti-fraud)
    mapping(bytes32 => bool) public receiptHashes;

    // Global stats
    uint256 public totalReceiptsProcessed;
    uint256 public totalRwtMinted;
    uint256 public totalRwtBurned;
    uint256 public totalAiaMinted;
    uint256 public totalAiaBurned;
    uint256 public totalNftConversions;
    uint256 public totalReferralsProcessed;

    // ------------------------------------------------------------------------
    // INTERNAL BALANCE HELPERS
    // ------------------------------------------------------------------------

    function _addBalance(mapping(address => uint256) storage bal, address user, uint256 amount) internal {
        bal[user] += amount;
    }

    function _subBalance(mapping(address => uint256) storage bal, address user, uint256 amount, string memory err)
        internal
    {
        uint256 current = bal[user];
        require(current >= amount, err);
        bal[user] = current - amount;
    }

    // ------------------------------------------------------------------------
    // MODULE FACING FUNCTIONS
    // ------------------------------------------------------------------------

    // --- Receipt processor ---

    function markReceiptUsed(bytes32 receiptHash) external whenNotPaused onlyReceiptProcessor {
        require(!receiptHashes[receiptHash], "Receipt already used");
        receiptHashes[receiptHash] = true;
        totalReceiptsProcessed += 1;
        emit ReceiptMarkedUsed(receiptHash);
    }

    function mintRwtFromReceipt(address to, uint256 amount) external whenNotPaused onlyReceiptProcessor {
        require(to != address(0), "Invalid user");
        if (amount > 0) {
            _addBalance(rwtBalance, to, amount);
            totalRwtMinted += amount;
            emit RwtMinted(to, amount, "receipt");
        }
    }

    // --- Rewards marketplace ---

    function burnRwtForReward(address from, uint256 amount) external whenNotPaused onlyRewardsModule {
        _subBalance(rwtBalance, from, amount, "Insufficient RWT to redeem");
        totalRwtBurned += amount;
        emit RwtBurned(from, amount, "reward");
    }

    // --- Referral ---

    function mintAiaFromReferral(address to, uint256 amount) external whenNotPaused onlyReferralModule {
        require(to != address(0), "Invalid user");
        _mintAiaInternal(to, amount);
        totalReferralsProcessed += 1;
        emit AiaMinted(to, amount, "referral");
    }

    // --- NFT conversion ---

    function mintAiaFromNft(address to, uint256 amount) external whenNotPaused onlyNftModule {
        require(to != address(0), "Invalid user");
        _mintAiaInternal(to, amount);
        totalNftConversions += 1;
        emit AiaMinted(to, amount, "nft");
    }

    // --- Staking ---

    function moveAiaIntoStake(address user, uint256 amount) external whenNotPaused onlyStakingModule {
        _subBalance(aiaBalance, user, amount, "Insufficient AIA to stake");
        _addBalance(aiaStaked, user, amount);
        emit AiaStaked(user, amount);
        // aiaMinted stays the same: we're just moving between liquid and staked.
    }

    function moveAiaOutOfStake(address user, uint256 amount) external whenNotPaused onlyStakingModule {
        _subBalance(aiaStaked, user, amount, "Insufficient staked AIA");
        _addBalance(aiaBalance, user, amount);
        emit AiaUnstaked(user, amount);
    }

    // ------------------------------------------------------------------------
    // OWNER / ADMIN FUNCTIONS (emergency, manual, or bootstrap)
    // ------------------------------------------------------------------------

    function mintRwt(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid user");
        _addBalance(rwtBalance, to, amount);
        totalRwtMinted += amount;
        emit RwtMinted(to, amount, "admin");
    }

    function burnRwt(address from, uint256 amount) external onlyOwner {
        _subBalance(rwtBalance, from, amount, "Insufficient RWT to burn");
        totalRwtBurned += amount;
        emit RwtBurned(from, amount, "admin");
    }

    function mintAia(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid user");
        _mintAiaInternal(to, amount);
        emit AiaMinted(to, amount, "admin");
    }

    function burnAia(address from, uint256 amount) external onlyOwner {
        _subBalance(aiaBalance, from, amount, "Insufficient AIA to burn");
        require(aiaMinted >= amount, "AIA minted underflow");
        aiaMinted -= amount;
        totalAiaBurned += amount;
        emit AiaBurned(from, amount, "admin");
    }

    /// @notice Pause all token operations (emergency only)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token operations
    function unpause() external onlyOwner {
        _unpause();
    }

    function _mintAiaInternal(address to, uint256 amount) internal {
        require(amount > 0, "Zero AIA");
        uint256 newTotal = aiaMinted + amount;
        require(newTotal <= AIA_TOTAL_SUPPLY, "AIA cap exceeded");
        aiaMinted = newTotal;
        _addBalance(aiaBalance, to, amount);
        totalAiaMinted += amount;
    }

    // ------------------------------------------------------------------------
    // VIEW HELPERS
    // ------------------------------------------------------------------------

    function isReceiptUsed(bytes32 receiptHash) external view returns (bool) {
        return receiptHashes[receiptHash];
    }

    /// @notice Get comprehensive system statistics
    /// @return receipts Total receipts processed
    /// @return rwtMinted Total RWT minted
    /// @return rwtBurned Total RWT burned
    /// @return aiaMintedTotal Total AIA minted
    /// @return aiaBurnedTotal Total AIA burned
    /// @return nftConversions Total NFT conversions
    /// @return referrals Total referrals processed
    function getSystemStats() external view returns (
        uint256 receipts,
        uint256 rwtMinted,
        uint256 rwtBurned,
        uint256 aiaMintedTotal,
        uint256 aiaBurnedTotal,
        uint256 nftConversions,
        uint256 referrals
    ) {
        return (
            totalReceiptsProcessed,
            totalRwtMinted,
            totalRwtBurned,
            totalAiaMinted,
            totalAiaBurned,
            totalNftConversions,
            totalReferralsProcessed
        );
    }

    /// @notice Get module version
    function getModuleVersion(address module) external view returns (uint256) {
        return moduleVersions[module];
    }
}
