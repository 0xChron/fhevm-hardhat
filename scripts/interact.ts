import { ethers, fhevm } from "hardhat";
import { PrivateTokenDistributor, MockERC20 } from "../types";

async function main() {
  // Get signers
  const [deployer, alice, bob] = await ethers.getSigners();

  console.log("=== Deploying Contracts ===");

  // Deploy MockERC20
  const MockTokenFactory = await ethers.getContractFactory("MockERC20");
  const mockToken = (await MockTokenFactory.deploy("Mock Token", "MTK")) as unknown as MockERC20;
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`MockToken deployed at: ${mockTokenAddress}`);

  // Deploy PrivateTokenDistributor
  const DistributorFactory = await ethers.getContractFactory("PrivateTokenDistributor");
  const distributor = (await DistributorFactory.deploy(mockTokenAddress)) as unknown as PrivateTokenDistributor;
  const distributorAddress = await distributor.getAddress();
  console.log(`PrivateTokenDistributor deployed at: ${distributorAddress}`);

  console.log("=== Contract Interaction Demo ===");
  console.log(`MockToken: ${mockTokenAddress}`);
  console.log(`Distributor: ${distributorAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Alice: ${alice.address}`);
  console.log(`Bob: ${bob.address}`);

  // 1. Mint tokens to deployer
  console.log("\n1. Minting tokens...");
  await mockToken.mint(deployer.address, ethers.parseEther("1000"));
  const deployerBalance = await mockToken.balanceOf(deployer.address);
  console.log(`Deployer token balance: ${ethers.formatEther(deployerBalance)} tokens`);

  // 2. Approve distributor to spend tokens
  console.log("\n2. Approving distributor...");
  await mockToken.approve(distributorAddress, ethers.parseEther("500"));
  const allowance = await mockToken.allowance(deployer.address, distributorAddress);
  console.log(`Distributor allowance: ${ethers.formatEther(allowance)} tokens`);

  // 3. Deposit tokens into distributor
  console.log("\n3. Depositing tokens...");
  await distributor.depositTokens(ethers.parseEther("200"));
  const contractBalance = await mockToken.balanceOf(distributorAddress);
  console.log(`Distributor contract balance: ${ethers.formatEther(contractBalance)} tokens`);

  // 4. Distribute encrypted tokens to Alice
  console.log("\n4. Distributing encrypted tokens to Alice...");
  const aliceAmount = 50; // 50 tokens for Alice

  const encryptedAliceAmount = await fhevm
    .createEncryptedInput(distributorAddress, deployer.address)
    .add32(aliceAmount)
    .encrypt();

  await distributor.distributeTokens(alice.address, encryptedAliceAmount.handles[0], encryptedAliceAmount.inputProof);
  console.log(`Distributed ${aliceAmount} encrypted tokens to Alice`);

  // 5. Alice checks her encrypted balance
  console.log("\n5. Alice checking her encrypted balance...");
  const aliceEncryptedBalance = await distributor.connect(alice).getMyBalance();
  console.log(`Alice's encrypted balance handle: ${aliceEncryptedBalance}`);

  // 6. Alice decrypts her balance
  console.log("\n6. Alice decrypting her balance...");
  const { FhevmType } = await import("@fhevm/hardhat-plugin");
  const aliceDecryptedBalance = await fhevm.userDecryptEuint(
    FhevmType.euint32,
    aliceEncryptedBalance,
    distributorAddress,
    alice as any,
  );
  console.log(`Alice's decrypted balance: ${aliceDecryptedBalance} tokens`);

  // 7. Batch distribute to multiple recipients
  console.log("\n7. Batch distributing to Bob and Charlie...");
  const bobAmount = 30;
  const charlieAmount = 20;

  const encryptedBobAmount = await fhevm
    .createEncryptedInput(distributorAddress, deployer.address)
    .add32(bobAmount)
    .encrypt();

  const encryptedCharlieAmount = await fhevm
    .createEncryptedInput(distributorAddress, deployer.address)
    .add32(charlieAmount)
    .encrypt();

  // For this example, we'll use bob's address for charlie too (you can create another signer)
  await distributor.batchDistributeTokens(
    [bob.address, bob.address], // Using bob twice for simplicity
    [encryptedBobAmount.handles[0], encryptedCharlieAmount.handles[0]],
    [encryptedBobAmount.inputProof, encryptedCharlieAmount.inputProof],
  );
  console.log(`Batch distributed ${bobAmount} and ${charlieAmount} tokens`);

  // 8. Bob checks and decrypts his balance
  console.log("\n8. Bob checking his balance...");
  const bobEncryptedBalance = await distributor.connect(bob).getMyBalance();
  const bobDecryptedBalance = await fhevm.userDecryptEuint(
    FhevmType.euint32,
    bobEncryptedBalance,
    distributorAddress,
    bob as any,
  );
  console.log(`Bob's decrypted balance: ${bobDecryptedBalance} tokens`);

  // 9. Alice requests withdrawal
  console.log("\n9. Alice requesting withdrawal...");
  await distributor.connect(alice).requestWithdrawal(aliceAmount);

  const [requestAmount, requestTime] = await distributor.getWithdrawalRequest(alice.address);
  console.log(`Alice's withdrawal request: ${requestAmount} tokens at timestamp ${requestTime}`);

  console.log("\n=== Demo Complete ===");
  console.log("To complete the withdrawal, wait for the delay period and call completeWithdrawal()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
