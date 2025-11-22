# Receiptx Modular EVM System (SupraEVM, Foundry)

This project contains a **modular dual-token & rewards system** for Receiptx, designed to run on an EVM chain such as **SupraEVM**.

It models:

- RWT (Real World Transaction Token) — unlimited reward ledger
- AIA (Analytics & Intelligence Asset) — capped governance/analytics ledger
- Receipt hash anti-fraud system
- Brand multipliers (Starbucks, McDonald's, Circle K)
- Referral bonuses (base vs multiplier brands)
- NFT → AIA conversions
- AIA staking tiers (Bronze/Silver/Gold/Premium)
- Rewards marketplace (burn RWT for rewards)
- Registry for receipt metadata & basic analytics

The design is **modular**:

- `ReceiptxCore` holds all balances, caps, receipt hashes, and global stats.
- Modules implement behavior and call into `ReceiptxCore`:
  - `ReceiptProcessor` — processes receipts, applies multipliers, mints RWT, and logs metadata.
  - `ReferralSystem` — processes referral bonuses and mints AIA.
  - `StakingTier` — stakes/unstakes AIA and tracks tier multipliers.
  - `NFTConversion` — converts NFTs into AIA and logs conversions.
  - `RewardsMarketplace` — burns RWT when users redeem rewards.
  - `Registry` — stores receipt metadata and some analytics-friendly views.

Because the **core contract is stable** and modules are external, you can "upgrade" logic by deploying new module contracts and using the `ReceiptxCore` setter functions to update the authorized module addresses, without migrating balances.

> NOTE: This system uses an **internal ledger**, not ERC-20 tokens. RWT & AIA are integer balances tracked in `ReceiptxCore`. You can wrap them into proper ERC-20s later if needed.

## Setup

```bash
forge init receiptx-modular-evm
# copy this repo's src/, script/, and foundry.toml into that folder
forge install openzeppelin/openzeppelin-contracts
forge build
```

You may also want forge-std:

```bash
forge install foundry-rs/forge-std
```

## Deploy

Edit `script/DeployReceiptxSystem.s.sol` with your SupraEVM RPC and run:

```bash
export PRIVATE_KEY=0x...
forge script script/DeployReceiptxSystem.s.sol \
  --rpc-url https://your-supra-evm-rpc \
  --broadcast
```

The script will:

1. Deploy ReceiptxCore.
2. Deploy all modules.
3. Wire module addresses into ReceiptxCore so only the correct modules can:
   - mint/burn RWT/AIA for specific flows
   - mark receipt hashes as used
   - move AIA into/out of stake.

You can then call the module contracts from your backend (Node/TS) or directly from your dApp or scripts.

## Chain Mapping

This system is intended for SupraEVM (Solidity side).

Your MoveVM receipt registry can coexist separately and share the same receipt hash format. Your backend is responsible for:

1. hashing canonical receipt JSON
2. writing that hash to MoveVM registry
3. then calling ReceiptProcessor here to mint RWT and log metadata.

## Architecture

### ReceiptxCore (Core Ledger)
- Stores RWT/AIA balances (internal ledger, not ERC-20)
- Tracks staked AIA separately
- Receipt hash anti-fraud registry
- Module authorization (only specific modules can mint/burn)
- Global statistics

### Modules
- **Registry**: Stores receipt metadata for analytics/UX
- **ReceiptProcessor**: Applies brand multipliers (1.5x for Starbucks/McD/CircleK), calculates RWT rewards
- **ReferralSystem**: Awards 5-10 AIA to referrers
- **StakingTier**: Handles AIA staking with 4 tiers (Bronze/Silver/Gold/Premium)
- **NFTConversion**: Converts loyalty NFTs into AIA tokens
- **RewardsMarketplace**: Burns RWT when users redeem rewards

## Usage Examples

### Process Receipt (Backend)
```javascript
const tx = await receiptProcessor.processReceipt(
  userAddress,
  receiptHash,
  1450, // $14.50 in cents
  "starbucks",
  "ocr",
  Math.floor(Date.now() / 1000)
);
```

### Stake AIA (User)
```javascript
const tx = await stakingTier.stakeAia(ethers.parseUnits("100", 0)); // 100 AIA
```

### Check Balances (Dashboard)
```javascript
const rwt = await core.rwtBalance(userAddress);
const aia = await core.aiaBalance(userAddress);
const staked = await core.aiaStaked(userAddress);
const [tier, multiplier, stakedAmount] = await stakingTier.getUserTier(userAddress);
```

## Security

- All minting/burning operations require specific module authorization
- Owner can update module addresses for "upgrades" without balance migration
- Receipt hashes prevent duplicate processing
- AIA supply capped at 1B tokens
