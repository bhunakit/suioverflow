# CAPT Token Minter

This project includes a reward scheduler that automatically mints CAPT tokens for completed detection sessions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
DATABASE_URL=your_neon_database_url
PRIVATE_KEY=your_sui_private_key
PACKAGE_ID=your_package_id
TREASURY_CAP_ID=your_treasury_cap_id
```

## Running the Reward Scheduler

The reward scheduler runs every 5 seconds to check for unrewarded sessions and mint tokens for them.

### Development Mode

Run with auto-restart on file changes:
```bash
npm run dev
```

### Production Mode

Run the scheduler:
```bash
npm start
```

## How It Works

1. The scheduler connects to your Neon database and the Sui network
2. Every 5 seconds, it checks for detection sessions that:
   - Have an end_time (completed sessions)
   - Haven't been rewarded yet (rewarded is null or false)
3. For each unrewarded session, it:
   - Calculates token reward based on session duration:
     - Base reward: 100 tokens
     - Bonus: 1 token per minute of session duration
   - Mints the calculated tokens to the session's wallet address
   - Updates the session record to mark it as rewarded
   - Records the reward time and amount

## Database Schema

The scheduler expects a `detection_sessions` table with the following columns:
- `id`: Unique identifier for the session
- `wallet_address`: The Sui wallet address to receive tokens
- `end_time`: Timestamp when the session ended
- `duration_seconds`: Number of seconds the session lasted
- `rewarded`: Boolean flag indicating if the session has been rewarded
- `reward_time`: Timestamp when the reward was given
- `reward_amount`: Number of tokens awarded

## Troubleshooting

- Check that all environment variables are set correctly
- Ensure your database has the required schema
- Verify that your Sui private key has permission to mint tokens
- Check the console logs for any errors 