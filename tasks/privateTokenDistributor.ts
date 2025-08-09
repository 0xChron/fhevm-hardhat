import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("distribute-tokens", "Distribute encrypted tokens to recipients")
  .addParam("contract", "The distributor contract address")
  .addParam("token", "The token contract address")
  .addParam("recipient", "The recipient address")
  .addParam("amount", "The amount to distribute")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, fhevm } = hre;
    const [deployer] = await ethers.getSigners();

    const distributor = await ethers.getContractAt("PrivateTokenDistributor", taskArgs.contract);
    const token = await ethers.getContractAt("MockERC20", taskArgs.token);

    console.log(`Distributing ${taskArgs.amount} tokens to ${taskArgs.recipient}`);

    // Create encrypted input
    const encryptedAmount = await fhevm
      .createEncryptedInput(taskArgs.contract, deployer.address)
      .add32(parseInt(taskArgs.amount))
      .encrypt();

    // Distribute tokens
    const tx = await distributor.distributeTokens(
      taskArgs.recipient,
      encryptedAmount.handles[0],
      encryptedAmount.inputProof,
    );

    await tx.wait();
    console.log(`Distribution complete. Transaction: ${tx.hash}`);
  });

task("check-balance", "Check encrypted balance of a recipient")
  .addParam("contract", "The distributor contract address")
  .addParam("address", "The address to check")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, fhevm } = hre;
    const [, , recipient] = await ethers.getSigners(); // Use third signer as recipient

    const distributor = await ethers.getContractAt("PrivateTokenDistributor", taskArgs.contract);

    // Get encrypted balance
    const encryptedBalance = await distributor.connect(recipient).getMyBalance();
    console.log(`Encrypted balance handle: ${encryptedBalance}`);

    try {
      // Try to decrypt (only works if the address matches the signer)
      const { FhevmType } = await import("@fhevm/hardhat-plugin");
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        taskArgs.contract,
        recipient,
      );
      console.log(`Decrypted balance: ${decryptedBalance} tokens`);
    } catch (error) {
      console.log("Cannot decrypt balance (not authorized or balance not set)");
    }
  });

task("request-withdrawal", "Request withdrawal of tokens")
  .addParam("contract", "The distributor contract address")
  .addParam("amount", "The amount to withdraw")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [, , recipient] = await ethers.getSigners();

    const distributor = await ethers.getContractAt("PrivateTokenDistributor", taskArgs.contract);

    console.log(`Requesting withdrawal of ${taskArgs.amount} tokens`);

    const tx = await distributor.connect(recipient).requestWithdrawal(parseInt(taskArgs.amount));
    await tx.wait();

    console.log(`Withdrawal request submitted. Transaction: ${tx.hash}`);
    console.log("Wait for the delay period before completing withdrawal.");
  });

task("complete-withdrawal", "Complete withdrawal after delay")
  .addParam("contract", "The distributor contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [, , recipient] = await ethers.getSigners();

    const distributor = await ethers.getContractAt("PrivateTokenDistributor", taskArgs.contract);

    console.log("Attempting to complete withdrawal...");

    try {
      const tx = await distributor.connect(recipient).completeWithdrawal();
      await tx.wait();
      console.log(`Withdrawal completed. Transaction: ${tx.hash}`);
    } catch (error) {
      console.log("Withdrawal failed:", error);
    }
  });

task("setup-demo", "Setup a complete demo environment").setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre;
  const [deployer, alice, bob] = await ethers.getSigners();

  console.log("=== Setting up demo environment ===");

  // Deploy contracts
  const MockTokenFactory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockTokenFactory.deploy("Demo Token", "DEMO");
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();

  const DistributorFactory = await ethers.getContractFactory("PrivateTokenDistributor");
  const distributor = await DistributorFactory.deploy(tokenAddress);
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();

  // Setup tokens
  await mockToken.mint(deployer.address, ethers.parseEther("1000"));
  await mockToken.approve(distributorAddress, ethers.parseEther("500"));
  await distributor.depositTokens(ethers.parseEther("200"));

  console.log("=== Demo environment ready ===");
  console.log(`Token address: ${tokenAddress}`);
  console.log(`Distributor address: ${distributorAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Alice: ${alice.address}`);
  console.log(`Bob: ${bob.address}`);

  console.log("\n=== Quick start commands ===");
  console.log(
    `npx hardhat distribute-tokens --contract ${distributorAddress} --token ${tokenAddress} --recipient ${alice.address} --amount 50 --network localhost`,
  );
  console.log(
    `npx hardhat check-balance --contract ${distributorAddress} --address ${alice.address} --network localhost`,
  );
  console.log(`npx hardhat request-withdrawal --contract ${distributorAddress} --amount 50 --network localhost`);
});
