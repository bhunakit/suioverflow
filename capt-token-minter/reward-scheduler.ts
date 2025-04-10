import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = neon(DATABASE_URL);

// Connect to Sui local network
const client = new SuiClient({
  url: getFullnodeUrl('localnet')
});

// Function to mint tokens
async function mintTokens(amountToMint: number, recipientAddress: string) {
  // Get values from environment variables
  const privateKeyHex = process.env.PRIVATE_KEY;
  const packageId = process.env.PACKAGE_ID;
  const treasuryCapId = process.env.TREASURY_CAP_ID;
  
  if (!privateKeyHex || !packageId || !treasuryCapId) {
    throw new Error('Missing required environment variables');
  }
  
  // Create keypair from private key
  let keypair;
  try {
    // Check if the private key is in Sui format (starts with 'suiprivkey')
    if (privateKeyHex.startsWith('suiprivkey')) {
      keypair = Ed25519Keypair.fromSecretKey(privateKeyHex);
    } else {
      // Convert private key hex to Uint8Array for raw hex format
      const privateKeyArray = Uint8Array.from(
        Buffer.from(privateKeyHex.replace(/^0x/, ''), 'hex')
      );
      keypair = Ed25519Keypair.fromSecretKey(privateKeyArray);
    }
  } catch (error: any) {
    console.error('Error creating keypair:', error);
    throw new Error(`Failed to create keypair: ${error.message}`);
  }
  
  // Create a transaction
  const tx = new Transaction();
  
  // Set the sender address
  tx.setSender(keypair.toSuiAddress());
  
  // Convert human-readable amount to base units (with 6 decimals)
  const baseUnits = BigInt(Math.floor(amountToMint * 1_000_000));
  
  // Call the mint function
  tx.moveCall({
    target: `${packageId}::capt_token::mint`,
    arguments: [
      tx.object(treasuryCapId),
      tx.pure.u64(baseUnits),
      tx.pure.address(recipientAddress)
    ]
  });
  
  // Set gas budget
  tx.setGasBudget(10000000);
  
  // Execute the transaction
  try {
    console.log(`Minting ${amountToMint} CAPT tokens to ${recipientAddress}...`);
    
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      }
    });
    
    console.log('Transaction successful!');
    console.log('Digest:', result.digest);
    return result;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}

// Function to check for unrewarded sessions and mint tokens
async function checkAndRewardSessions() {
  try {
    // Query for sessions that have ended but haven't been rewarded yet
    // Including duration_seconds in the query
    const result = await sql`
      SELECT session_id, wallet_address, duration_seconds 
      FROM detection_sessions 
      WHERE end_time IS NOT NULL 
      AND (rewarded IS NULL OR rewarded = false)
      LIMIT 10
    `;
    
    console.log(`Found ${result.length} unrewarded sessions`);
    
    // Process each unrewarded session
    for (const session of result) {
      if (!session.wallet_address) {
        console.log(`Session ${session.session_id} has no wallet address, skipping`);
        continue;
      }
      
      try {
        // Calculate token amount based on duration
        // Base reward is 100 tokens, plus 1 token per 60 seconds (1 minute)
        const totalTokens = session.duration_seconds;
        
        console.log(`Session ${session.session_id} duration: ${session.duration_seconds} seconds, awarding ${totalTokens} tokens`);
        
        // Mint tokens for the session
        await mintTokens(totalTokens, session.wallet_address);
        
        // Mark the session as rewarded
        await sql`
          UPDATE detection_sessions 
          SET rewarded = true
          WHERE session_id = ${session.session_id}
        `;
        
        console.log(`Successfully rewarded session ${session.session_id} with ${totalTokens} tokens`);
      } catch (error) {
        console.error(`Failed to reward session ${session.session_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking for unrewarded sessions:', error);
  }
}

// Function to run the scheduler
async function runScheduler() {
  console.log('Starting reward scheduler...');
  
  // Run immediately on startup
  await checkAndRewardSessions();
  
  // Then run every 5 seconds
  setInterval(async () => {
    await checkAndRewardSessions();
  }, 5000);
}

// Start the scheduler
runScheduler().catch(error => {
  console.error('Scheduler error:', error);
  process.exit(1);
}); 