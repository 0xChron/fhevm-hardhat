import { ethers } from "hardhat";
import { PrivateTokenDistributor, MockERC20 } from "../types";

async function main() {
  // Get signers
  const [deployer] = await ethers.getSigners();

  // Deploy contracts first
  console.log("=== Deploying Contracts ===");

  // Deploy MockERC20
  const MockTokenFactory = await ethers.getContractFactory("MockERC20");
  const mockToken = (await MockTokenFactory.deploy("Private Token", "PRIV")) as MockERC20;
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`MockERC20 deployed to: ${mockTokenAddress}`);

  // Deploy PrivateTokenDistributor
  const DistributorFactory = await ethers.getContractFactory("PrivateTokenDistributor");
  const distributor = (await DistributorFactory.deploy(mockTokenAddress)) as PrivateTokenDistributor;
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();
  console.log(`PrivateTokenDistributor deployed to: ${distributorAddress}`);

  console.log("\n=== Setup Complete ===");
  console.log(`To interact with your contracts, update the addresses in scripts/interact.ts:`);
  console.log(`MOCK_TOKEN_ADDRESS = "${mockTokenAddress}"`);
  console.log(`DISTRIBUTOR_ADDRESS = "${distributorAddress}"`);
  console.log(`\nThen run: npx hardhat run scripts/interact.ts --network localhost`);

  return {
    mockToken: mockTokenAddress,
    distributor: distributorAddress,
  };
}

main()
  .then((addresses) => {
    console.log("\nContract addresses:", addresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
