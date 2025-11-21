/// ReceiptX Dual Token System
/// RWT (Reward Token) - Unlimited supply, earned 1:1 with receipt amounts
/// AIA (Analytics Token) - Capped at 1B supply, earned via NFT conversion and referrals
module receiptx::dual_token {
    use std::signer;
    use std::error;
    use std::string::{Self, String};
    use supra_framework::coin::{Self, Coin};
    use supra_framework::event;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_INITIALIZED: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 4;
    const E_AIA_SUPPLY_CAP_REACHED: u64 = 5;
    const E_INVALID_AMOUNT: u64 = 6;

    /// AIA supply cap: 1 billion tokens (with 8 decimals)
    const AIA_SUPPLY_CAP: u64 = 100000000000000000; // 1B * 10^8

    /// Token metadata
    struct RWT {}
    struct AIA {}

    /// Global state for token system
    struct TokenRegistry has key {
        /// Total RWT minted (unlimited)
        rwt_total_supply: u64,
        /// Total AIA minted (capped at 1B)
        aia_total_supply: u64,
        /// Admin account for minting operations
        admin: address,
        /// Emergency pause flag
        is_paused: bool,
    }

    /// User balance tracker
    struct UserBalance has key {
        rwt_balance: u64,
        aia_balance: u64,
    }

    /// Events
    struct RWTMintedEvent has drop, store {
        recipient: address,
        amount: u64,
        receipt_hash: String,
        timestamp: u64,
    }

    struct AIAMintedEvent has drop, store {
        recipient: address,
        amount: u64,
        source: String, // "nft_conversion" | "referral"
        timestamp: u64,
    }

    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        token_type: String, // "RWT" | "AIA"
        timestamp: u64,
    }

    /// Initialize the dual token system (admin only, one-time)
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<TokenRegistry>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));

        move_to(admin, TokenRegistry {
            rwt_total_supply: 0,
            aia_total_supply: 0,
            admin: admin_addr,
            is_paused: false,
        });
    }

    /// Mint RWT tokens (unlimited supply, called by receipt processor)
    public entry fun mint_rwt(
        minter: &signer,
        recipient: address,
        amount: u64,
        receipt_hash: String,
    ) acquires TokenRegistry, UserBalance {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let registry = borrow_global_mut<TokenRegistry>(@receiptx);
        assert!(!registry.is_paused, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(signer::address_of(minter) == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));

        // Update total supply (unlimited for RWT)
        registry.rwt_total_supply = registry.rwt_total_supply + amount;

        // Update user balance
        if (!exists<UserBalance>(recipient)) {
            move_to(minter, UserBalance {
                rwt_balance: amount,
                aia_balance: 0,
            });
        } else {
            let user_balance = borrow_global_mut<UserBalance>(recipient);
            user_balance.rwt_balance = user_balance.rwt_balance + amount;
        };

        // Emit event
        event::emit(RWTMintedEvent {
            recipient,
            amount,
            receipt_hash,
            timestamp: supra_framework::timestamp::now_microseconds(),
        });
    }

    /// Mint AIA tokens (capped at 1B, called by NFT converter or referral system)
    public entry fun mint_aia(
        minter: &signer,
        recipient: address,
        amount: u64,
        source: String,
    ) acquires TokenRegistry, UserBalance {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let registry = borrow_global_mut<TokenRegistry>(@receiptx);
        assert!(!registry.is_paused, error::permission_denied(E_NOT_AUTHORIZED));
        assert!(signer::address_of(minter) == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));

        // Check supply cap
        let new_supply = registry.aia_total_supply + amount;
        assert!(new_supply <= AIA_SUPPLY_CAP, error::resource_exhausted(E_AIA_SUPPLY_CAP_REACHED));

        // Update total supply
        registry.aia_total_supply = new_supply;

        // Update user balance
        if (!exists<UserBalance>(recipient)) {
            move_to(minter, UserBalance {
                rwt_balance: 0,
                aia_balance: amount,
            });
        } else {
            let user_balance = borrow_global_mut<UserBalance>(recipient);
            user_balance.aia_balance = user_balance.aia_balance + amount;
        };

        // Emit event
        event::emit(AIAMintedEvent {
            recipient,
            amount,
            source,
            timestamp: supra_framework::timestamp::now_microseconds(),
        });
    }

    /// Transfer RWT tokens between users
    public entry fun transfer_rwt(
        sender: &signer,
        recipient: address,
        amount: u64,
    ) acquires UserBalance {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let sender_addr = signer::address_of(sender);
        assert!(exists<UserBalance>(sender_addr), error::not_found(E_NOT_INITIALIZED));
        
        let sender_balance = borrow_global_mut<UserBalance>(sender_addr);
        assert!(sender_balance.rwt_balance >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        sender_balance.rwt_balance = sender_balance.rwt_balance - amount;

        if (!exists<UserBalance>(recipient)) {
            move_to(sender, UserBalance {
                rwt_balance: amount,
                aia_balance: 0,
            });
        } else {
            let recipient_balance = borrow_global_mut<UserBalance>(recipient);
            recipient_balance.rwt_balance = recipient_balance.rwt_balance + amount;
        };

        // Emit event
        event::emit(TransferEvent {
            from: sender_addr,
            to: recipient,
            amount,
            token_type: string::utf8(b"RWT"),
            timestamp: supra_framework::timestamp::now_microseconds(),
        });
    }

    /// Transfer AIA tokens between users
    public entry fun transfer_aia(
        sender: &signer,
        recipient: address,
        amount: u64,
    ) acquires UserBalance {
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));
        
        let sender_addr = signer::address_of(sender);
        assert!(exists<UserBalance>(sender_addr), error::not_found(E_NOT_INITIALIZED));
        
        let sender_balance = borrow_global_mut<UserBalance>(sender_addr);
        assert!(sender_balance.aia_balance >= amount, error::invalid_state(E_INSUFFICIENT_BALANCE));
        
        sender_balance.aia_balance = sender_balance.aia_balance - amount;

        if (!exists<UserBalance>(recipient)) {
            move_to(sender, UserBalance {
                rwt_balance: 0,
                aia_balance: amount,
            });
        } else {
            let recipient_balance = borrow_global_mut<UserBalance>(recipient);
            recipient_balance.aia_balance = recipient_balance.aia_balance + amount;
        };

        // Emit event
        event::emit(TransferEvent {
            from: sender_addr,
            to: recipient,
            amount,
            token_type: string::utf8(b"AIA"),
            timestamp: supra_framework::timestamp::now_microseconds(),
        });
    }

    /// Get user RWT balance
    public fun get_rwt_balance(user: address): u64 acquires UserBalance {
        if (!exists<UserBalance>(user)) {
            return 0
        };
        borrow_global<UserBalance>(user).rwt_balance
    }

    /// Get user AIA balance
    public fun get_aia_balance(user: address): u64 acquires UserBalance {
        if (!exists<UserBalance>(user)) {
            return 0
        };
        borrow_global<UserBalance>(user).aia_balance
    }

    /// Get total RWT supply (unlimited)
    public fun get_rwt_total_supply(): u64 acquires TokenRegistry {
        borrow_global<TokenRegistry>(@receiptx).rwt_total_supply
    }

    /// Get total AIA supply (capped)
    public fun get_aia_total_supply(): u64 acquires TokenRegistry {
        borrow_global<TokenRegistry>(@receiptx).aia_total_supply
    }

    /// Get remaining AIA supply available
    public fun get_aia_remaining_supply(): u64 acquires TokenRegistry {
        let current_supply = borrow_global<TokenRegistry>(@receiptx).aia_total_supply;
        AIA_SUPPLY_CAP - current_supply
    }

    /// Emergency pause (admin only)
    public entry fun pause(admin: &signer) acquires TokenRegistry {
        let registry = borrow_global_mut<TokenRegistry>(@receiptx);
        assert!(signer::address_of(admin) == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));
        registry.is_paused = true;
    }

    /// Emergency unpause (admin only)
    public entry fun unpause(admin: &signer) acquires TokenRegistry {
        let registry = borrow_global_mut<TokenRegistry>(@receiptx);
        assert!(signer::address_of(admin) == registry.admin, error::permission_denied(E_NOT_AUTHORIZED));
        registry.is_paused = false;
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        initialize(admin);
    }
}
