# stealthdrop: FHEVM Private Token Distribution

<div align="center">
  <img src="assets/stealthdrop-logo.png" alt="Logo" width="100"/>
</div>
<br>

A Solidity smart contract that leverages Fully Homomorphic Encryption (FHE) to enable confidential token transfers and
distributions on-chain. Designed for scenarios like airdrop campaigns, targeted wallet distributions, and other
privacy-sensitive token allocations, it ensures that transfer amounts remain encrypted and hidden from public view while
still being verifiable on the blockchain.

## Sample UI

![alt text](assets/ui.png)

## 📁 Project Structure

```
fhevm-hardhat-template/
├── contracts/
│   └── MockERC20.sol
│   └── PrivateTokenDistributor.sol
├── deploy/
├── tasks/
├── test/
├── hardhat.config.ts
└── package.json
```

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
