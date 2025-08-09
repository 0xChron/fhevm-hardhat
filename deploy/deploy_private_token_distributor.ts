import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // First deploy the mock token for testing
  const mockToken = await deploy("MockERC20", {
    from: deployer,
    args: ["Mock Token", "MTK"],
    log: true,
  });

  // Then deploy the PrivateTokenDistributor with the mock token address
  await deploy("PrivateTokenDistributor", {
    from: deployer,
    args: [mockToken.address],
    log: true,
  });

  // For testing, mint some tokens to the deployer
  const mockTokenContract = await ethers.getContractAt("MockERC20", mockToken.address);
  await mockTokenContract.mint(deployer, ethers.parseEther("10000"));

  console.log("Deployment completed.");
};

func.tags = ["PrivateTokenDistributor", "MockERC20", "test"];

export default func;
