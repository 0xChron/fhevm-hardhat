import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // First deploy the MockERC20 token
  const deployedMockToken = await deploy("MockERC20", {
    from: deployer,
    args: ["Test Token", "TEST"],
    log: true,
  });

  console.log(`MockERC20 contract: `, deployedMockToken.address);

  // Then deploy the PrivateTokenDistributor with the token address
  const deployedPrivateTokenDistributor = await deploy("PrivateTokenDistributor", {
    from: deployer,
    args: [deployedMockToken.address],
    log: true,
  });

  console.log(`PrivateTokenDistributor contract: `, deployedPrivateTokenDistributor.address);
};
export default func;
func.id = "deploy_privateTokenDistributor"; // id required to prevent reexecution
func.tags = ["PrivateTokenDistributor", "MockERC20"];
