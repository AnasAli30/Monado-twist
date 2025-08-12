# Monad Twist - Spin to Earn Game

Monad Twist is a modern, purple-themed "spin to earn" dApp built on Monad, featuring a beautiful animated spinner, wallet integration, backend spin/reward logic, and a smart contract vault for winnings. Users can spin to win MON tokens, buy extra spins, share to earn spins, and track their winnings on a leaderboard.

## Features

- **Animated Spinner Wheel**: Visually appealing, always-rotating wheel with probability-based rewards.
- **Wallet Integration**: Connect your wallet to play and withdraw winnings.
- **Spin Logic**: Backend tracks spins per user (by Farcaster FID), with daily resets and persistent storage in MongoDB.
- **Buy Spins**: Users can buy extra spins with MON tokens.
- **Share to Earn**: Share the game to earn extra spins (once per 24 hours).
- **First-Time Envelope Reward**: New users can claim a random MON reward.
- **Winner Vault**: Smart contract holds winnings; users can withdraw at any time.
- **Leaderboard**: See the top winners and their FIDs.
- **Modern UI**: Glassmorphism, gradients, and responsive design.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, wagmi, ethers, framer-motion, react-icons
- **Backend**: Next.js API routes, MongoDB
- **Smart Contract**: Solidity (WinnerVault)
- **Wallets**: Monad testnet, wagmi hooks
- **Farcaster**: MiniApp context for user identity

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Monad-twist.git
cd Monad-twist
```

### 2. Install Dependencies

```bash
yarn install
# or
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root with the following:

```
NEXT_PUBLIC_WINNER_VAULT_ADDRESS=0xYourWinnerVaultAddress
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
MONGODB_DB=Monad-twist
MONAD_RPC_URL=https://your-monad-rpc-url
WALLET_PRIVATE_KEY_1=your_private_key_1
WALLET_PRIVATE_KEY_2=your_private_key_2
# ...add more keys as needed
ENVELOPE_PRIVATE_KEY=your_envelope_private_key
```

- **WinnerVault**: Deploy the provided Solidity contract and use its address.
- **MongoDB**: Use a MongoDB Atlas connection string or your own instance.
- **Wallet Keys**: Used for backend transactions (multiple for load balancing).
- **Envelope Key**: Used for first-time reward payouts.

### 4. Run the Development Server

```bash
yarn dev
# or
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the app.

## Project Structure

- `components/Home/SpinAndEarn.tsx` - Main spinner UI and logic
- `components/Home/InnerWallet.tsx` - User's vault balance and withdraw
- `components/Home/Leaderboard.tsx` - Top winners
- `components/Home/EnvelopeReward.tsx` - First-time reward modal
- `pages/api/spin.ts` - Spin logic (decrement, add, buy, reset)
- `pages/api/win.ts` - Handle winnings, send to WinnerVault, +1 spin on win
- `pages/api/leaderboard.ts` - Leaderboard data
- `pages/api/send-envelope.ts` - First-time reward payout
- `lib/mongodb.ts` - MongoDB connection utility

## Customization

- **Spinner Segments**: Edit the `segments` array in `SpinAndEarn.tsx` to change rewards, probabilities, or colors.
- **UI Theme**: Tweak Tailwind and CSS-in-JS styles for your own look.
- **Contract**: Use your own WinnerVault contract if needed.


## License

MIT 
