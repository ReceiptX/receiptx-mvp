const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying ReceiptX Dual Token System to Supra Testnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "SUPRA\n");

  // Deploy UUPS Upgradeable Contract
  console.log("Deploying ReceiptxDualTokenUpgradeable contract...");
  const ReceiptxDualToken = await hre.ethers.getContractFactory("ReceiptxDualTokenUpgradeable");
  
  const proxy = await upgrades.deployProxy(ReceiptxDualToken, [], {
    initializer: "initialize",
    kind: "uups",
  });

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n✅ DEPLOYMENT SUCCESSFUL!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 Contract Addresses:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Proxy Address:       ", proxyAddress);
  console.log("Implementation:      ", implementationAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Test contract
  console.log("🧪 Testing contract functions...");
  const rwtName = await proxy.RWT_NAME();
  const aiaName = await proxy.AIA_NAME();
  const aiaTotalSupply = await proxy.AIA_TOTAL_SUPPLY();
  
  console.log("RWT Token Name:", rwtName);
  console.log("RWT Symbol: RWT (unlimited supply)");
  console.log("AIA Token Name:", aiaName);
  console.log("AIA Symbol: AIA");
  console.log("AIA Total Supply:", aiaTotalSupply.toString());

  console.log("\n🔗 View on Explorer:");
  console.log(`https://testnet.suprascan.io/address/${proxyAddress}\n`);

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: "supra-testnet",
    chainId: 6,
    proxyAddress: proxyAddress,
    implementationAddress: implementationAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    rwtToken: {
      name: "Receiptx Reward Token",
      symbol: "RWT",
      supply: "Unlimited (mint on receipt scan)",
    },
    aiaToken: {
      name: "Receiptx Analytics Token",
      symbol: "AIA",
      totalSupply: "1,000,000,000",
      minted: "0",
    },
    explorerUrl: `https://testnet.suprascan.io/address/${proxyAddress}`
  };

  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📄 Deployment info saved to deployment-info.json");
  console.log("\n⚙️  Add to your .env file:");
  console.log(`SUPRA_CONTRACT_ADDRESS=${proxyAddress}`);
  console.log(`SUPRA_DEPLOYER_ADDRESS=${deployer.address}\n`);
  console.log("✅ Contract is functional and ready to use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
