# Private Token Distributor - Interaction Guide

This guide shows you how to interact with your deployed `PrivateTokenDistributor` contract using various methods.

## Quick Start

### 1. Deploy the Contracts

```bash
# Option 1: Using scripts
npx hardhat run scripts/deploy.ts --network localhost

# Option 2: Using deployment script
npx hardhat deploy --network localhost

# Option 3: Using custom task
npx hardhat setup-demo --network localhost
```

### 2. Start Local Network (if needed)

```bash
# Start local hardhat node in a separate terminal
npx hardhat node
```

## Interaction Methods

### Method 1: Using Custom Hardhat Tasks

The easiest way to interact with your contract:

```bash
# Setup demo environment with contracts and initial tokens
npx hardhat setup-demo --network localhost

# Distribute encrypted tokens to a recipient
npx hardhat distribute-tokens \
  --contract <DISTRIBUTOR_ADDRESS> \
  --token <TOKEN_ADDRESS> \
  --recipient <RECIPIENT_ADDRESS> \
  --amount 50 \
  --network localhost

# Check encrypted balance of a recipient
npx hardhat check-balance \
  --contract <DISTRIBUTOR_ADDRESS> \
  --address <RECIPIENT_ADDRESS> \
  --network localhost

# Request withdrawal
npx hardhat request-withdrawal \
  --contract <DISTRIBUTOR_ADDRESS> \
  --amount 50 \
  --network localhost

# Complete withdrawal (after delay)
npx hardhat complete-withdrawal \
  --contract <DISTRIBUTOR_ADDRESS> \
  --network localhost
```

### Method 2: Using Interaction Scripts

```bash
# First update the contract addresses in scripts/interact.ts
npx hardhat run scripts/interact.ts --network localhost
```

### Method 3: Using Hardhat Console

```bash
# Start interactive console
npx hardhat console --network localhost
```

Then in the console:

```javascript
// Get contracts
const MockERC20 = await ethers.getContractFactory("MockERC20");
const PrivateTokenDistributor = await ethers.getContractFactory("PrivateTokenDistributor");

// Connect to deployed contracts
const token = MockERC20.attach("YOUR_TOKEN_ADDRESS");
const distributor = PrivateTokenDistributor.attach("YOUR_DISTRIBUTOR_ADDRESS");

// Get signers
const [deployer, alice, bob] = await ethers.getSigners();

// Mint tokens to deployer
await token.mint(deployer.address, ethers.parseEther("1000"));

// Approve and deposit
await token.approve(distributor.address, ethers.parseEther("500"));
await distributor.depositTokens(ethers.parseEther("200"));

// Create encrypted input and distribute
const encryptedAmount = await fhevm.createEncryptedInput(distributor.address, deployer.address).add32(50).encrypt();

await distributor.distributeTokens(alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
```

## Contract Functions

### Owner Functions (only contract owner)

- `depositTokens(amount)` - Deposit tokens into the contract
- `distributeTokens(recipient, encryptedAmount, proof)` - Distribute encrypted amounts
- `batchDistributeTokens(recipients, amounts, proofs)` - Batch distribute
- `setToken(newTokenAddress)` - Change the token address
- `transferOwnership(newOwner)` - Transfer contract ownership
- `emergencyWithdraw(amount)` - Emergency token withdrawal

### User Functions

- `getMyBalance()` - Get your encrypted balance
- `requestWithdrawal(amount)` - Request to withdraw tokens
- `completeWithdrawal()` - Complete withdrawal after delay
- `cancelWithdrawal()` - Cancel pending withdrawal
- `getWithdrawalRequest(user)` - Check withdrawal request status

### Public View Functions

- `token()` - Get token contract address
- `owner()` - Get contract owner
- `WITHDRAWAL_DELAY()` - Get withdrawal delay period
- `getTotalDistributed()` - Get total distributed (owner only)

## Key Features

### 🔐 **Privacy-Preserving**

- Token amounts are encrypted using FHE (Fully Homomorphic Encryption)
- Only recipients can decrypt their own balances
- Distribution amounts remain confidential on-chain

### ⏱️ **Time-Delayed Withdrawals**

- Withdrawals require a time delay (default: 1 hour)
- Provides security against unauthorized access
- Users can cancel withdrawal requests

### 📦 **Batch Operations**

- Distribute to multiple recipients in a single transaction
- Efficient for airdrops and bulk distributions

## Example Workflow

1. **Setup**: Deploy contracts and deposit tokens
2. **Distribute**: Send encrypted amounts to recipients
3. **Check Balance**: Recipients can view their encrypted balance
4. **Decrypt**: Recipients decrypt their balance client-side
5. **Withdraw**: Recipients request withdrawal with decrypted amount
6. **Wait**: Withdrawal delay period passes
7. **Complete**: Recipients complete their withdrawal

## Security Considerations

- Always verify contract addresses before interacting
- Keep private keys secure
- Understand the withdrawal delay mechanism
- Use appropriate gas limits for FHE operations

## Troubleshooting

### Common Issues:

- **"InvalidSigner" error**: Ensure encrypted input signer matches transaction sender
- **"ACLNotAllowed" error**: Contract needs FHE permissions (handled automatically)
- **"Insufficient balance"**: Ensure contract has enough tokens for withdrawals
- **"Withdrawal delay not passed"**: Wait for the full delay period

### Getting Help:

- Check transaction receipts for detailed error messages
- Verify contract state before operations
- Ensure proper FHE setup and permissions
