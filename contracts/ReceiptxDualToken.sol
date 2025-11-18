// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// ---------------------------------------------------------------------------
/// RECEIPTX DUAL TOKEN SYSTEM
/// RWT  - Real World Transaction Token (rewards; infinite supply)
/// AIA  - Analytics & Intelligence Asset (fixed supply; governance/analytics)
/// Receipt hashes  - used for anti-fraud / duplicate prevention
/// ---------------------------------------------------------------------------
contract ReceiptxDualTokenUpgradeable is UUPSUpgradeable, OwnableUpgradeable {
    // ----------------------------------------------------------------------
    // RWT TOKEN — UNLIMITED SUPPLY (reward token)
    // ----------------------------------------------------------------------
    string public constant RWT_NAME = "Receiptx Reward Token";
    string public constant RWT_SYMBOL = "RWT";

    mapping(address => uint256) public rwtBalance;

    // ----------------------------------------------------------------------
    // AIA TOKEN — FIXED SUPPLY (governance + analytics)
    // ----------------------------------------------------------------------
    string public constant AIA_NAME = "Receiptx Analytics Token";
    string public constant AIA_SYMBOL = "AIA";

    // Simple integer supply (you can treat as 1e18-style decimals off-chain if you want)
    uint256 public constant AIA_TOTAL_SUPPLY = 1_000_000_000;
    uint256 public aiaMinted;
    mapping(address => uint256) public aiaBalance;

    // ----------------------------------------------------------------------
    // RECEIPT HASHING — ANTI-FRAUD LAYER
    // ----------------------------------------------------------------------
    mapping(bytes32 => bool) public receiptHashes;

    // ----------------------------------------------------------------------
    // EVENTS
    // ----------------------------------------------------------------------
    event RWTMinted(address indexed user, uint256 amount);
    event RWTBurned(address indexed user, uint256 amount);
    event AIAMinted(address indexed user, uint256 amount);
    event ReceiptHashStored(bytes32 indexed hash);

    // ----------------------------------------------------------------------
    // INITIALIZER (instead of constructor)
    // ----------------------------------------------------------------------
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // ----------------------------------------------------------------------
    // RWT FUNCTIONS — MINT/BURN (reward token)
    // ----------------------------------------------------------------------

    /// @notice Mint RWT for a user (receipt rewards, multipliers, referrals, etc.)
    function mintRWT(address user, uint256 amount) external onlyOwner {
        rwtBalance[user] += amount;
        emit RWTMinted(user, amount);
    }

    /// @notice Burn RWT if you ever need a sink mechanic
    function burnRWT(address user, uint256 amount) external onlyOwner {
        require(rwtBalance[user] >= amount, "Insufficient RWT");
        rwtBalance[user] -= amount;
        emit RWTBurned(user, amount);
    }

    // ----------------------------------------------------------------------
    // AIA FUNCTIONS — FIXED SUPPLY (analytics/governance)
    // ----------------------------------------------------------------------

    /// @notice Mint AIA up to hard cap (for governance, analytics access, etc.)
    function mintAIA(address user, uint256 amount) external onlyOwner {
        require(aiaMinted + amount <= AIA_TOTAL_SUPPLY, "AIA cap exceeded");
        aiaBalance[user] += amount;
        aiaMinted += amount;
        emit AIAMinted(user, amount);
    }

    // ----------------------------------------------------------------------
    // RECEIPT HASH STORAGE (anti-fraud)
    // ----------------------------------------------------------------------

    /// @notice Store a unique receipt hash so it can't be reused
    function storeReceiptHash(bytes32 hash) external onlyOwner {
        receiptHashes[hash] = true;
        emit ReceiptHashStored(hash);
    }

    /// @notice Check if a receipt hash is already used
    function isReceiptUsed(bytes32 hash) external view returns (bool) {
        return receiptHashes[hash];
    }

    // ----------------------------------------------------------------------
    // TRANSFER FUNCTIONS (basic ERC20-style)
    // ----------------------------------------------------------------------

    /// @notice Transfer RWT tokens
    function transferRWT(address to, uint256 amount) external {
        require(rwtBalance[msg.sender] >= amount, "Insufficient RWT balance");
        rwtBalance[msg.sender] -= amount;
        rwtBalance[to] += amount;
    }

    /// @notice Transfer AIA tokens
    function transferAIA(address to, uint256 amount) external {
        require(aiaBalance[msg.sender] >= amount, "Insufficient AIA balance");
        aiaBalance[msg.sender] -= amount;
        aiaBalance[to] += amount;
    }
}
