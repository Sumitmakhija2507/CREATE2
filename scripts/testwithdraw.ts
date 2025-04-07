import { ethers, upgrades } from "hardhat";

async function main() {
    // Get the first signer (deployer)
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    // // Deploy Mock Token (if needed)
    //     const MockToken = await ethers.getContractFactory("MockERC20");
    //     const mockToken = await MockToken.deploy("RapidX Mock", "RPMX");
    //     await mockToken.waitForDeployment();
    //     console.log("Mock Token deployed to:", mockToken.target);

    // Deploy RapidX Contract
    const RapidX = await ethers.getContractFactory("RapidX");
    const rapidXProxy = await upgrades.deployProxy(RapidX, [], { initializer: "initialize" });
    console.log("aa");
    await rapidXProxy.waitForDeployment();



    console.log("RapidX Proxy deployed to:", rapidXProxy.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });