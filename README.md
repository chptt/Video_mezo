# PrivateStream Mezo

> Privacy-preserving encrypted video access platform on Mezo.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Mezo](https://img.shields.io/badge/Mezo-Testnet-blue)](https://mezzo.xyz)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Privacy-First Architecture Note

> **This MVP demonstrates encrypted access control architecture on Mezo.**

Current implementation uses AES-256-GCM encrypted metadata on IPFS, server-side decryption gated by on-chain access verification, and wallet-gated access control.

---

## Project Overview

Creators can:
1. Connect MetaMask wallet
2. Create **one campaign per wallet** (enforced on-chain)
3. Upload an unlisted YouTube video link
4. Encrypt the video metadata before IPFS storage
5. Set access price, duration, and campaign details
6. Earn ETH — campaign auto-closes at **$20 USD gross revenue**

Buyers:
1. Connect MetaMask and pay ETH on Arbitrum Sepolia
2. Smart contract records access expiry on-chain
3. Backend verifies wallet + on-chain access, decrypts video URL server-side
4. Watch video inside the platform only

---

## Architecture

```
Frontend (Next.js)
  Marketplace → Campaign Detail → Watch Page → Dashboard
        |
  Next.js API Routes (serverless)
    /api/ipfs/upload    → Encrypt + Upload to Pinata IPFS
    /api/campaign/*     → Campaign CRUD + Access checks
    /api/campaign/*/play → Verify access + Decrypt URL
        |                           |
  Pinata IPFS                Arbitrum Sepolia
  Encrypted Metadata         PrivateStreamFHE Contract
```

---

## Complete Deployment Guide — 5 Steps

```
STEP 1 → Generate Encryption Key        (terminal, 30 seconds)
STEP 2 → Set up Pinata IPFS             (browser, 5 minutes)
STEP 3 → Deploy Contract via Remix      (browser, 10 minutes)
STEP 4 → Fill in .env.local             (text editor, 5 minutes)
STEP 5 → Deploy frontend to Vercel      (terminal, 5 minutes)
```

No Hardhat. No private key in config files. No local blockchain tools needed.

---

## STEP 1 — Generate Encryption Key

The encryption key is used server-side to AES-256-GCM encrypt every video URL
before it is stored on IPFS. It must be exactly 32 bytes (64 hex characters).

**Run this in your terminal:**

```bash
node -e "const {randomBytes}=require('crypto'); console.log(randomBytes(32).toString('hex'))"
```

**Example output:**
```
a3f8c2d1e4b7091f6a2c5d8e3b1f4a7c9d2e5b8f1a4c7d0e3b6f9a2c5d8e1b4
```

Save this string. You will paste it as `ENCRYPTION_MASTER_KEY` in Step 4.

> **Security warning:** This key decrypts all video URLs. Never commit it to git.
> Never log it. Never send it to the frontend. Store it only in `.env.local`
> and in your Vercel environment variables.

---

## STEP 2 — Set Up Pinata IPFS

Pinata stores the encrypted campaign metadata JSON on IPFS. The raw video URL
is never stored — only the AES-256-GCM ciphertext, IV, and auth tag.

### 2a. Create a Pinata Account

1. Go to **[pinata.cloud](https://pinata.cloud)**
2. Click **Sign Up** and create a free account
   - Free tier gives 1 GB storage — more than enough for this project
3. Verify your email address

### 2b. Generate an API Key (JWT)

1. Log in to Pinata
2. Click your profile icon (top right) → **API Keys**
3. Click **+ New Key**
4. Under Permissions, enable these three:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin`
5. Give the key a name like `privatestream-fhe`
6. Click **Generate API Key**
7. A popup shows your JWT — it starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
8. **Copy the JWT immediately** — it is only shown once

Save this JWT. You will paste it as `PINATA_JWT` in Step 4.

---

## STEP 3 — Deploy Smart Contract via Remix

Remix is a browser-based Solidity IDE. You deploy directly from your browser
using MetaMask. No Hardhat, no terminal commands, no private key in any file.

### 3a. Add Arbitrum Sepolia to MetaMask

1. Open MetaMask → click the network name at the top
2. Click **Add Network** → **Add a network manually**
3. Enter these values exactly:

| Field | Value |
|-------|-------|
| Network Name | `Arbitrum Sepolia` |
| New RPC URL | `https://sepolia-rollup.arbitrum.io/rpc` |
| Chain ID | `421614` |
| Currency Symbol | `ETH` |
| Block Explorer URL | `https://sepolia.arbiscan.io` |

4. Click **Save** then switch to Arbitrum Sepolia

### 3b. Get Free Test ETH

You need test ETH to pay gas for deployment (costs about 0.0001 ETH).

- **[faucet.quicknode.com/arbitrum/sepolia](https://faucet.quicknode.com/arbitrum/sepolia)**
  → paste your wallet address → click Send → receive 0.1 ETH in ~30 seconds
- **[faucet.triangleplatform.com/arbitrum/sepolia](https://faucet.triangleplatform.com/arbitrum/sepolia)**
  → alternative if the first one is rate-limited

Check your balance at [sepolia.arbiscan.io](https://sepolia.arbiscan.io) by searching your address.

### 3c. Open Remix and Create the Contract File

1. Go to **[remix.ethereum.org](https://remix.ethereum.org)** in your browser
2. In the **File Explorer** panel on the left side, find the `contracts/` folder
3. Right-click `contracts/` → **New File**
4. Name the file: `PrivateStreamFHE.sol`
5. Open `contracts/PrivateStreamFHE.sol` from this project on your computer
6. Select all the text (Ctrl+A) and copy it (Ctrl+C)
7. Click on the new file in Remix and paste (Ctrl+V)

The file should start with:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
```

### 3d. Compile the Contract

1. Click the **Solidity Compiler** tab in the left sidebar
   - It looks like the letter `S` with angle brackets: `<S>`
2. In the **Compiler** dropdown, select version `0.8.24`
   - If you don't see it, click the dropdown and type `0.8.24`
3. Expand **Advanced Configurations**
4. Check the **Enable optimization** checkbox
5. Set **Runs** to `200`
6. Click the blue **Compile PrivateStreamFHE.sol** button
7. Wait a few seconds — you should see a green checkmark ✅

If you see red errors, make sure you copied the entire contract file including
the license comment at the very top.

### 3e. Calculate the Constructor Parameters

The contract needs 3 values when deploying. Prepare them now.

**`_treasury` — your wallet address**
This wallet receives the 10% platform fee from every purchase.
```
Example: 0xAbCd1234EfGh5678IjKl9012MnOp3456QrSt7890
```
Copy your MetaMask wallet address.

**`_feeBps` — platform fee in basis points**
1000 basis points = 10%. This is fixed.
```
1000
```

**`_revenueCapWei` — the $20 USD cap converted to wei**

Open your browser console (press F12 → click Console tab) and run:
```javascript
// Replace 3000 with the current ETH price in USD
Math.floor((20 / 3000) * 1e18).toString()
```

Check the current ETH price at [coinmarketcap.com](https://coinmarketcap.com/currencies/ethereum/)
then use the matching value from this table:

| Current ETH Price | Use this value for `_revenueCapWei` |
|-------------------|-------------------------------------|
| $2,000 | `10000000000000000` |
| $2,500 | `8000000000000000` |
| $3,000 | `6666666666666667` |
| $3,500 | `5714285714285714` |
| $4,000 | `5000000000000000` |
| $4,500 | `4444444444444444` |

### 3f. Deploy the Contract

1. Click the **Deploy & Run Transactions** tab in the left sidebar
   - It looks like a rocket ship 🚀
2. Under **Environment**, click the dropdown and select:
   **`Injected Provider - MetaMask`**
3. MetaMask will pop up asking to connect — click **Connect**
4. Check that the network shown in Remix says **Arbitrum Sepolia** and Chain ID **421614**
   - If it shows a different network, switch MetaMask to Arbitrum Sepolia first, then refresh Remix
5. Under **Contract**, make sure the dropdown shows `PrivateStreamFHE`
6. Click the small **arrow ▼** next to the orange Deploy button to expand the input fields
7. Fill in the three constructor parameters:

```
_treasury      →  0xYourMetaMaskWalletAddress
_feeBps        →  1000
_revenueCapWei →  6666666666666667   (or your calculated value from Step 3e)
```

8. Click the orange **Deploy** button
9. MetaMask pops up showing the transaction details — click **Confirm**
10. Wait 5–15 seconds for the transaction to be mined

You will see a green success message in the Remix terminal at the bottom.

### 3g. Copy the Deployed Contract Address

1. In Remix, scroll down in the left panel to the **Deployed Contracts** section
2. You will see: `PRIVATESTREAMFHE AT 0x...`
3. Click the **copy icon** next to the address
4. The address looks like: `0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B`

You can also verify it on Arbiscan:
1. Go to [sepolia.arbiscan.io](https://sepolia.arbiscan.io)
2. Search your MetaMask wallet address
3. Click **Internal Txns** or **Contract Creation** — you will see the new contract

**Save this contract address.** You need it for Step 4.

### 3h. (Optional) Verify Contract Source on Arbiscan

Verifying makes your contract source code publicly readable, which builds trust
with users who want to audit the code.

1. Go to [sepolia.arbiscan.io](https://sepolia.arbiscan.io)
2. Search your deployed contract address
3. Click the **Contract** tab → **Verify and Publish**
4. Fill in:
   - Compiler Type: `Solidity (Single file)`
   - Compiler Version: `v0.8.24+commit...`
   - Open Source License: `MIT License (MIT)`
5. Click **Continue**
6. Paste the full contract source code into the text box
7. Click **Verify and Publish**

After verification, the Contract tab will show a green checkmark ✅ and users
can read the source code directly on Arbiscan.

---

## STEP 4 — Fill in .env.local

Now you have all the pieces. Create the environment file.

### 4a. Create the file

```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# Mac / Linux
cp .env.example .env.local
```

### 4b. Open .env.local and fill in every value

```env
# ── App ──────────────────────────────────────────────────────
# For local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000
# After Vercel deploy, change to: https://your-app.vercel.app

# ── Arbitrum Sepolia ─────────────────────────────────────────
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# ── Smart Contract ───────────────────────────────────────────
# Paste the address you copied from Remix Step 3g
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# ── Pinata IPFS ──────────────────────────────────────────────
# Paste the JWT you copied from Pinata Step 2b
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# ── Encryption ───────────────────────────────────────────────
# Paste the 64-character hex string from Step 1
ENCRYPTION_MASTER_KEY=a3f8c2d1e4b7091f6a2c5d8e3b1f4a7c...

# ── Platform ─────────────────────────────────────────────────
# Your MetaMask wallet address (same as _treasury in Remix)
PLATFORM_TREASURY_ADDRESS=0xYourMetaMaskAddress
REVENUE_CAP_USD=20
PLATFORM_FEE_PERCENTAGE=10

# ── ETH Price Fallback ───────────────────────────────────────
# Used when CoinGecko API is unavailable — set to current ETH price
ETH_USD_FALLBACK=3000

# ── Dev Only ─────────────────────────────────────────────────
ALLOW_MOCK_PAYMENT=false
```

### 4c. Start the development server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

**Test the full flow locally:**
1. Connect MetaMask (switch to Arbitrum Sepolia)
2. Go to `/campaign/create` → create a test campaign with an unlisted YouTube URL
3. Go to `/marketplace` → your campaign should appear
4. Use a second wallet to purchase access
5. Go to `/watch/[id]` → the video should play inside the secure player

---

## STEP 5 — Deploy Frontend to Vercel

Vercel hosts the Next.js app and runs the serverless API routes automatically.

### 5a. Install Vercel CLI

```bash
npm install -g vercel
```

### 5b. Deploy from the project folder

```bash
vercel
```

Answer the prompts:
- **Set up and deploy?** → `Y`
- **Which scope?** → select your Vercel account
- **Link to existing project?** → `N` (first time)
- **Project name?** → press Enter to accept `privatestream-fhe`
- **In which directory is your code?** → press Enter (current directory `./`)
- **Want to modify settings?** → `N`

Vercel builds and deploys. You get a URL like:
`https://privatestream-fhe-abc123.vercel.app`

### 5c. Add Environment Variables in Vercel Dashboard

The `.env.local` file is NOT uploaded to Vercel. You must add each variable manually.

1. Go to **[vercel.com/dashboard](https://vercel.com/dashboard)**
2. Click your project → **Settings** tab → **Environment Variables**
3. Add each variable one by one:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (your actual Vercel URL) |
| `NEXT_PUBLIC_CHAIN_ID` | `421614` |
| `NEXT_PUBLIC_RPC_URL` | `https://sepolia-rollup.arbitrum.io/rpc` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Your contract address from Step 3g |
| `PINATA_JWT` | Your Pinata JWT from Step 2b |
| `PINATA_GATEWAY_URL` | `https://gateway.pinata.cloud` |
| `ENCRYPTION_MASTER_KEY` | Your 64-char hex key from Step 1 |
| `PLATFORM_TREASURY_ADDRESS` | Your MetaMask wallet address |
| `REVENUE_CAP_USD` | `20` |
| `PLATFORM_FEE_PERCENTAGE` | `10` |
| `ETH_USD_FALLBACK` | `3000` |
| `ALLOW_MOCK_PAYMENT` | `false` |

4. After adding all variables, go to the **Deployments** tab
5. Click the three dots `...` on the latest deployment → **Redeploy**
6. Click **Redeploy** (without clearing cache)

Your app is now live at your Vercel URL.

### 5d. Final check

Visit your Vercel URL and test:
- Landing page loads with cyberpunk styling
- MetaMask connects and switches to Arbitrum Sepolia
- Campaign creation works (encrypts URL, uploads to IPFS, calls contract)
- Marketplace shows campaigns
- Purchase flow works on-chain
- Watch page decrypts and plays video

---

## Smart Contract Reference

**Contract:** `PrivateStreamFHE.sol` — deployed on Arbitrum Sepolia

| Function | Description |
|----------|-------------|
| `createCampaign(cid, priceWei, durationSeconds)` | Create campaign — one per wallet |
| `purchaseAccess(campaignId)` | Buy access, auto-splits 90/10 |
| `getCampaign(campaignId)` | Read campaign data |
| `hasAccess(campaignId, buyer)` | Check if buyer has valid access |
| `deactivateCampaign(campaignId)` | Creator can deactivate |

One campaign per wallet is enforced on-chain:
```solidity
mapping(address => bool) public hasCampaign;
require(!hasCampaign[msg.sender], "Already own a campaign");
```

---

## Revenue Cap System

- Cap: **$20 USD equivalent** in ETH (set at deploy time)
- When `totalRevenueWei >= revenueCapWei`:
  - `soldOut = true`, `active = false`
  - New purchases blocked
  - Existing buyers keep access until their expiry timestamp

Payment split on every purchase:
```
Buyer pays 1.0 ETH
  → Creator receives 0.9 ETH  (90%)
  → Platform treasury 0.1 ETH (10%)
```

---

## Security Architecture

| Asset | How it is protected |
|-------|---------------------|
| Video URL | AES-256-GCM encrypted, never stored in plaintext |
| Encryption Key | Server-side only, never sent to frontend |
| Access Control | On-chain expiry timestamps verified server-side |
| Decryption | Only inside API route after on-chain access check |

**Known limitation:** YouTube iframe embedding cannot fully prevent advanced users
from inspecting network requests. True content protection requires encrypted HLS
streaming + DRM. This MVP protects the URL itself, not the stream.

---

## Future FHE Upgrade Path

```
Current MVP:
  AES-256-GCM (server-side) + on-chain access timestamps

Phase 2 (Fhenix / Zama fhEVM):
  Encrypted access tokens stored on-chain as FHE ciphertexts
  Encrypted payment splits — amounts hidden from public view

Phase 3 (Full FHE):
  All computation inside encrypted execution environment
  Server never sees any plaintext values
  Encrypted usage analytics and recommendation systems
```

---

## Project Structure

```
privatestream-fhe/
├── app/
│   ├── page.tsx                     Landing page
│   ├── marketplace/page.tsx         Browse active campaigns
│   ├── campaign/create/page.tsx     Create campaign form
│   ├── campaign/[id]/page.tsx       Campaign detail + purchase
│   ├── watch/[id]/page.tsx          Secure video player
│   ├── dashboard/page.tsx           Creator analytics
│   └── api/
│       ├── campaign/                Campaign CRUD + access routes
│       ├── ipfs/upload/             Encrypt + upload to IPFS
│       ├── pricing/                 ETH/USD price
│       └── transactions/verify/     TX verification
├── components/
│   ├── Navbar.tsx
│   ├── WalletConnect.tsx            MetaMask hook + UI
│   ├── CampaignCard.tsx
│   ├── PurchaseButton.tsx           On-chain purchase flow
│   ├── SecurePlayer.tsx             Sandboxed iframe player
│   ├── RevenueProgress.tsx          Animated progress bar
│   ├── CountdownTimer.tsx           Access expiry countdown
│   ├── AccessBadge.tsx
│   ├── LoadingSpinner.tsx
│   └── EmptyState.tsx
├── lib/
│   ├── encryption.ts                AES-256-GCM (server-only)
│   ├── ipfs.ts                      Pinata IPFS client
│   ├── arbitrum.ts                  ethers.js blockchain reads
│   ├── access.ts                    Access verification logic
│   ├── pricing.ts                   ETH/USD conversion
│   ├── youtube.ts                   URL parsing + embed conversion
│   ├── validation.ts                Input validation
│   ├── campaignRegistry.ts          Campaign data fetching
│   ├── constants.ts                 App-wide constants + ABI
│   └── utils.ts                     General utilities
├── contracts/
│   └── PrivateStreamFHE.sol         Solidity smart contract
├── .env.example                     Environment variable template
└── README.md
```

---

## Known Limitations

1. **YouTube iframe** — Advanced users can inspect network requests to find the embed URL. True protection requires encrypted HLS + DRM.
2. **ETH/USD price** — Revenue cap is fixed at deploy time. It does not update as ETH price changes.
3. **No refunds** — Purchases are final, enforced by the smart contract.
4. **One campaign per wallet** — Design constraint enforced on-chain. Can be changed in the contract if needed.

---

## License

MIT

*Built with Next.js 16, ethers.js v6, Pinata IPFS, Arbitrum Sepolia, Framer Motion.*
