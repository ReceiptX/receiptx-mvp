// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RWT Token (ReceiptX Reward Token)
 * @dev Dual-token system: Earn rewards, battle with brands
 * Deployed on Supra Testnet
 */
contract RWTToken is ERC20, Ownable, Pausable {
    // Token decimals
    uint8 private constant DECIMALS = 18;
    
    // Maximum supply: 1 billion RWT
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**DECIMALS;
    
    // Minting roles
    mapping(address => bool) public minters;
    
    // Receipt tracking (fraud prevention)
    mapping(bytes32 => bool) public processedReceipts;
    
    // Brand multipliers
    mapping(string => uint256) public brandMultipliers; // e.g., "Starbucks" => 150 (1.5x)
    
    // Events
    event ReceiptProcessed(bytes32 indexed receiptHash, address indexed user, uint256 amount, string brand);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BrandMultiplierUpdated(string brand, uint256 multiplier);
    event RewardDistributed(address indexed user, uint256 amount, string reason);

    constructor() ERC20("ReceiptX Reward Token", "RWT") Ownable(msg.sender) {
        // Set initial brand multipliers (150 = 1.5x)
        brandMultipliers["Starbucks"] = 150;
        brandMultipliers["Circle K"] = 150;
        brandMultipliers["Dr Pepper"] = 150;
        brandMultipliers["Unknown"] = 100; // 1.0x for unknown brands
        
        // Add deployer as initial minter
        minters[msg.sender] = true;
        emit MinterAdded(msg.sender);
    }

    /**
     * @dev Mint RWT tokens from receipt scan
     * @param user Address to receive tokens
     * @param receiptAmount Dollar amount from receipt (e.g., 50 for $50)
     * @param brand Brand name from receipt
     * @param receiptHash Unique hash to prevent duplicate claims
     */
    function mintFromReceipt(
        address user,
        uint256 receiptAmount,
        string memory brand,
        bytes32 receiptHash
    ) external whenNotPaused returns (uint256) {
        require(minters[msg.sender], "RWT: Not authorized minter");
        require(user != address(0), "RWT: Invalid user address");
        require(receiptAmount > 0, "RWT: Invalid amount");
        require(!processedReceipts[receiptHash], "RWT: Receipt already processed");
        
        // Calculate reward: $1 = 1 RWT base
        uint256 baseReward = receiptAmount * 10**DECIMALS;
        
        // Apply brand multiplier
        uint256 multiplier = brandMultipliers[brand];
        if (multiplier == 0) {
            multiplier = brandMultipliers["Unknown"]; // Default 1.0x
        }
        
        uint256 totalReward = (baseReward * multiplier) / 100;
        
        // Check max supply
        require(totalSupply() + totalReward <= MAX_SUPPLY, "RWT: Max supply exceeded");
        
        // Mark receipt as processed
        processedReceipts[receiptHash] = true;
        
        // Mint tokens
        _mint(user, totalReward);
        
        emit ReceiptProcessed(receiptHash, user, totalReward, brand);
        emit RewardDistributed(user, totalReward, "Receipt scan");
        
        return totalReward;
    }

    /**
     * @dev Batch mint for multiple users (airdrops, promotions)
     */
    function batchMint(address[] memory users, uint256[] memory amounts) external onlyOwner {
        require(users.length == amounts.length, "RWT: Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(totalSupply() + amounts[i] <= MAX_SUPPLY, "RWT: Max supply exceeded");
            _mint(users[i], amounts[i]);
            emit RewardDistributed(users[i], amounts[i], "Batch mint");
        }
    }

    /**
     * @dev Add authorized minter (backend API)
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "RWT: Invalid address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @dev Remove minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @dev Update brand multiplier (150 = 1.5x, 200 = 2.0x)
     */
    function setBrandMultiplier(string memory brand, uint256 multiplier) external onlyOwner {
        require(multiplier >= 100 && multiplier <= 500, "RWT: Multiplier out of range"); // 1.0x to 5.0x
        brandMultipliers[brand] = multiplier;
        emit BrandMultiplierUpdated(brand, multiplier);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get token decimals
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Check if receipt was already processed
     */
    function isReceiptProcessed(bytes32 receiptHash) external view returns (bool) {
        return processedReceipts[receiptHash];
    }

    /**
     * @dev Calculate potential reward without minting
     */
    function calculateReward(uint256 receiptAmount, string memory brand) external view returns (uint256) {
        uint256 baseReward = receiptAmount * 10**DECIMALS;
        uint256 multiplier = brandMultipliers[brand];
        if (multiplier == 0) {
            multiplier = brandMultipliers["Unknown"];
        }
        return (baseReward * multiplier) / 100;
    }
}
