module capt_coin::capt_token {
    use sui::coin::{Self, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};

    // Define a struct for your coin - must match module name in uppercase
    struct CAPT_TOKEN has drop {}

    // Maximum supply constant (1 billion tokens with 6 decimals)
    const MAX_SUPPLY: u128 = 1_000_000_000_000_000;

    // Struct to track the current supply
    struct Supply has key {
        id: UID,
        current_supply: u128,
    }

    // Initialize the coin with a one-time witness
    fun init(witness: CAPT_TOKEN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6, // Decimals
            b"CAPT Coin", // Name
            b"CAPT", // Symbol
            b"Captain's governance and utility token for the ecosystem", // Description
            option::none(), // Icon URL
            ctx,
        );

        // Initialize supply tracking
        let supply = Supply {
            id: object::new(ctx),
            current_supply: 0,
        };

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::share_object(supply);
    }

    // Mint function to create new coins
    public fun mint(
        treasury_cap: &mut TreasuryCap<CAPT_TOKEN>,
        supply: &mut Supply,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        // Check if minting would exceed max supply
        assert!(supply.current_supply + (amount as u128) <= MAX_SUPPLY, 0);
        
        let coin = coin::mint(treasury_cap, amount, ctx);
        supply.current_supply = supply.current_supply + (amount as u128);
        transfer::public_transfer(coin, recipient);
    }

    // Burn function to destroy coins
    public fun burn(
        treasury_cap: &mut TreasuryCap<CAPT_TOKEN>,
        supply: &mut Supply,
        coin: coin::Coin<CAPT_TOKEN>,
    ) {
        let amount = coin::value(&coin);
        coin::burn(treasury_cap, coin);
        supply.current_supply = supply.current_supply - (amount as u128);
    }

    // Get current supply
    public fun get_current_supply(supply: &Supply): u128 {
        supply.current_supply
    }

    // Get max supply
    public fun get_max_supply(): u128 {
        MAX_SUPPLY
    }
}