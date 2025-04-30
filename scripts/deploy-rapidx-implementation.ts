import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying RapidX Implementation with the account:", deployer.address);


    // Load the factory address from deployments
    const network = process.env.HARDHAT_NETWORK || "local";
    const factoryDeploymentFile = path.join(__dirname, `../deployments/factory-${network}.json`);

    if (!fs.existsSync(factoryDeploymentFile)) {
        console.error(`Factory deployment not found at ${factoryDeploymentFile}`);
        console.error("Please run deploy-create3-factory.ts first");
        process.exit(1);
    }

    const factoryDeployment = JSON.parse(fs.readFileSync(factoryDeploymentFile, "utf8"));
    const factoryAddress = factoryDeployment.factoryAddress;

    console.log("Using CREATE3Factory at:", factoryAddress);
    const factory = await ethers.getContractAt("ICREATE3Factory", factoryAddress);

    // Deploy the RapidX implementation
    console.log("Deploying RapidX implementation...");
    const RapidX = await ethers.getContractFactory("RapidX");
    const implementationBytecode = RapidX.bytecode;

    // Choose a salt for deterministic addressing
    const implementationSalt = ethers.id("RAPIDX_IMPLEMENTATION_V1");

    // Use CREATE3 to deploy the implementation
    const implementationTx = await factory.deploy(
        implementationSalt,
        implementationBytecode,
        { gasLimit: 5000000 } // Adjust gas limit as needed
    );

    const implementationReceipt = await implementationTx.wait();

    // Get the implementation address
    const implementationAddress = await factory.getDeployed(
        deployer.address,
        implementationSalt
    );

    console.log("RapidX implementation deployed to:", implementationAddress);

    // Save deployment info to a JSON file
    const deploymentInfo = {
        factoryAddress: factoryAddress,
        implementationAddress: implementationAddress,
        implementationSalt: implementationSalt
    };

    const deploymentsDir = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `implementation-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`Deployment info saved to ./deployments/implementation-${network}.json`);

    // For verification on BscScan
    console.log("\nFor verification on BscScan:");
    console.log(`npx hardhat verify --network ${network} ${implementationAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });