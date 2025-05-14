# CREATE2 in Solidity: Deterministic Smart Contract Deployment Across All EVM-Compatible Blockchains

`CREATE2` is a powerful opcode in the Ethereum Virtual Machine (EVM) that enables smart contracts to be deployed at **predictable, deterministic addresses** — a critical feature for cross-chain deployments, counterfactual wallets, and modular smart contract systems.

This repository demonstrates how to deploy:

* A **CREATE2 Factory** (for deterministic deployments)
* An **ExampleContract** (a UUPS proxy smart contract)
* At the **same address across multiple EVM-compatible blockchains**

---

## 📌 Table of Contents

* [Understanding CREATE and CREATE2](#understanding-create-and-create2)
* [Why Deterministic Deployment Matters](#why-deterministic-deployment-matters)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)
* [How It Works](#how-it-works)
* [Deployment Guide](#deployment-guide)
* [Important Notes](#important-notes)
* [License](#license)

---

## 📚 Understanding CREATE and CREATE2

### 🔨 `CREATE` (Standard Contract Deployment)

When you deploy a smart contract using tools like **Remix** or **Hardhat**, the EVM uses the `CREATE` opcode. The deployed contract's address is calculated as:

```solidity
keccak256(rlp(sender_address, sender_nonce))[12:]
```

* **`sender_address`**: The deployer (EOA or contract)
* **`sender_nonce`**: Number of prior transactions/contracts from the sender

⚠️ **Limitation**: You **cannot predict** the resulting contract address unless you know the exact nonce — making multi-chain or deterministic deployments difficult.

---

### 🚀 `CREATE2` (Deterministic Deployment)

Introduced in [EIP-1014](https://eips.ethereum.org/EIPS/eip-1014), `CREATE2` allows smart contracts to be deployed at addresses **predictable in advance**.

#### 📐 Address Formula

```solidity
keccak256(0xff ++ deployer_address ++ salt ++ keccak256(bytecode))[12:]
```

* `0xff`: Static byte used to avoid collisions with `CREATE`
* `deployer_address`: Address deploying the contract
* `salt`: A user-defined `bytes32` value
* `bytecode`: Initialization code of the contract (incl. constructor args)

✅ This allows you to compute the future contract address **off-chain**, before the contract is even deployed.

---

## ❗ Why Deterministic Deployment Matters

* 🚀 **Multi-chain consistency**: Deploy the same contract at the same address on Ethereum, Arbitrum, Base, Optimism, etc.
* ⚙️ **Smart account factories**: Used by wallets like Safe (formerly Gnosis Safe)
* 🔁 **Upgrade systems**: Enables modular upgradeable logic via proxies
* 🤝 **Inter-contract references**: Other contracts can reference an address before it’s deployed

---

## 📁 Project Structure

```bash
.
├── contracts/
│   ├── Create2Factory.sol       # Deploys contracts using CREATE2
│   └── ExampleContract.sol      # UUPS proxy contract
├── scripts/
│   ├── deploy-create2-factory.ts
│   ├── deploy.ts
│   └── deployall.ts
├── .env                         # Private keys and network configs
├── hardhat.config.ts
└── README.md
```

---

## 🚀 Getting Started

### ✅ Prerequisites

* Node.js v16+
* Hardhat
* Ethers.js
* TypeScript

### ⚙️ Setup

```bash
git clone https://github.com/your-username/create2-crosschain-deployment.git
cd create2-crosschain-deployment
npm install
```

---

## 🔐 Environment Variables

Edit the `.env` file and add your private keys:

```env
CREATE2_DEPLOYER_AT_SAME_ADDRESS_PRIVATE_KEY=your_fresh_wallet_private_key
SMART_CONTRACT_DEPLOYER_AT_SAME_ADDRESS=your_second_wallet_private_key
```

### 💡 Wallet Notes

* `CREATE2_DEPLOYER`: This wallet must be **fresh** (nonce = 0) to ensure the factory deploys to the same address across chains.
* `SMART_CONTRACT_DEPLOYER`: This wallet will use the factory to deploy the actual UUPS contract deterministically.

---

## ⚙️ How It Works

1. Deploy the `Create2Factory` using `CREATE` (must be same address across chains).
2. Use `Create2Factory` to deploy `ExampleContract` using `CREATE2`.
3. Result: `ExampleContract` is deployed at the **same address** on all EVM-compatible chains.

---

## 📤 Deployment Guide

Deploy to Sepolia (or any other EVM network):

```bash
npx hardhat run scripts/deployall.ts --network Ethereum_SEPOLIA
```

This will:

1. Deploy the `Create2Factory`:

   ```bash
   npx hardhat run scripts/deploy-create2-factory.ts --network Ethereum_SEPOLIA
   ```
2. Deploy the `ExampleContract` using the deployed factory:

   ```bash
   npx hardhat run scripts/deploy.ts --network Ethereum_SEPOLIA
   ```

Repeat the same command for other networks like Arbitrum, Optimism, Base, etc.

---

## ⚠️ Important Notes

* If the **factory contract is deployed using `CREATE`**, its address will depend on the deployer’s nonce. That’s why you must:

  * Use a **fresh wallet** with nonce = 0
  * OR deploy the factory using **`CREATE2` itself** to lock its address deterministically
* Only if the **factory contract is deployed at the same address**, will the `CREATE2` contract also deploy at the same address across chains.

---

## 📚 Resources

* [EIP-1014 - CREATE2](https://eips.ethereum.org/EIPS/eip-1014)
* [Solidity Docs: Contract Creation](https://docs.soliditylang.org/)
* [CREATE2 Explained Visually](https://mirror.xyz/kendricktan.eth/GwPmsB3y9QJDaD9KqKCNQ0Xc8GJ3OdCUfTkN-6CGnfk)

---

---

Would you like me to also generate a sample `deployall.ts` script or badges (like npm, Hardhat, License) for extra polish on GitHub?
