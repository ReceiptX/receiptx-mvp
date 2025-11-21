// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ReceiptxCore.sol";
import "../src/modules/Registry.sol";
import "../src/modules/ReceiptProcessor.sol";
import "../src/modules/ReferralSystem.sol";
import "../src/modules/StakingTier.sol";
import "../src/modules/NFTConversion.sol";
import "../src/modules/RewardsMarketplace.sol";

/// @title DeployReceiptxSystem
/// @notice Foundry script that deploys the full modular Receiptx system and wires modules into the core.
contract DeployReceiptxSystem is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // 1) Deploy core
        ReceiptxCore core = new ReceiptxCore();

        // 2) Deploy registry
        Registry registry = new Registry();

        // 3) Deploy modules (owner = deployer by default)
        ReceiptProcessor processor = new ReceiptProcessor(core, registry);
        ReferralSystem referral = new ReferralSystem(core);
        StakingTier staking = new StakingTier(core);
        NFTConversion nftConv = new NFTConversion(core);
        RewardsMarketplace rewards = new RewardsMarketplace(core);

        // 4) Wire registry -> receipt processor
        registry.setReceiptProcessor(address(processor));

        // 5) Wire modules into core with version 1 (onlyOwner = deployer, and core.owner() == deployer)
        core.setReceiptProcessor(address(processor), 1);
        core.setReferralModule(address(referral), 1);
        core.setStakingModule(address(staking), 1);
        core.setNftModule(address(nftConv), 1);
        core.setRewardsModule(address(rewards), 1);

        vm.stopBroadcast();

        console2.log("ReceiptxCore deployed at:", address(core));
        console2.log("Registry deployed at:", address(registry));
        console2.log("ReceiptProcessor deployed at:", address(processor));
        console2.log("ReferralSystem deployed at:", address(referral));
        console2.log("StakingTier deployed at:", address(staking));
        console2.log("NFTConversion deployed at:", address(nftConv));
        console2.log("RewardsMarketplace deployed at:", address(rewards));
    }
}
