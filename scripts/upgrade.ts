import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading RapidX Implementation with account:", deployer.address);

    // Load deployment information
    const network = process.env.HARDHAT_NETWORK || "local";

    // We need both the proxy deployment and the CREATE3 factory
    const proxyDeploymentFile = path.join(__dirname, `../deployments/proxy-${network}.json`);

    if (!fs.existsSync(proxyDeploymentFile)) {
        console.error(`Proxy deployment not found at ${proxyDeploymentFile}`);
        console.error("Please run deploy-rapidx-proxy.ts first");
        process.exit(1);
    }

    const proxyDeployment = JSON.parse(fs.readFileSync(proxyDeploymentFile, "utf8"));
    const factoryAddress = proxyDeployment.factoryAddress;
    const proxyAddress = proxyDeployment.proxyAddress;
    const oldImplementationAddress = proxyDeployment.implementationAddress;

    console.log("Using CREATE3Factory at:", factoryAddress);
    console.log("Current proxy at:", proxyAddress);
    console.log("Current implementation at:", oldImplementationAddress);

    const factory = await ethers.getContractAt("ICREATE3Factory", factoryAddress);

    // Deploy the new implementation
    console.log("\n📄 Deploying new RapidX implementation...");

    // Get the updated contract factory (make sure you've updated the contract code)
    const RapidX = await ethers.getContractFactory("RapidX");
    const implementationBytecode = RapidX.bytecode;

    // Choose a new salt for the new implementation version
    const newImplementationSalt = ethers.id("RAPIDX_IMPLEMENTATION_V2");

    // Deploy the new implementation using CREATE3
    const implementationTx = await factory.deploy(
        newImplementationSalt,
        implementationBytecode,
        { gasLimit: 5000000 }
    );

    const implementationReceipt = await implementationTx.wait();

    // Get the new implementation address
    const newImplementationAddress = await factory.getDeployed(
        deployer.address,
        newImplementationSalt
    );

    console.log("✅ New RapidX implementation deployed to:", newImplementationAddress);

    // Connect to proxy with the UUPSUpgradeable interface to access upgradeTo
    const UUPS_INTERFACE = [
        "function upgradeTo(address newImplementation) external",
        "function owner() external view returns (address)"
    ];

    const proxy = new ethers.Contract(proxyAddress, UUPS_INTERFACE, deployer);

    // Check if the caller is the owner
    const owner = await proxy.owner();
    if (owner !== deployer.address) {
        console.error(`You are not the owner of the contract. Current owner is ${owner}`);
        process.exit(1);
    }

    // Upgrade the implementation
    console.log("\n🔄 Upgrading proxy implementation...");
    const upgradeTx = await proxy.upgradeTo(newImplementationAddress);
    await upgradeTx.wait();

    console.log("✅ Proxy implementation upgraded successfully!");

    // Save upgrade info
    const upgradeInfo = {
        ...proxyDeployment,
        previousImplementationAddress: oldImplementationAddress,
        implementationAddress: newImplementationAddress,
        implementationSalt: newImplementationSalt.toString(),
        upgradeDate: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save updated deployment info
    fs.writeFileSync(
        path.join(deploymentsDir, `proxy-${network}.json`),
        JSON.stringify(upgradeInfo, null, 2)
    );

    // Also save a history record
    fs.writeFileSync(
        path.join(deploymentsDir, `upgrade-history-${network}-${Date.now()}.json`),
        JSON.stringify(upgradeInfo, null, 2)
    );

    console.log(`\n📝 Upgrade info saved to ./deployments/proxy-${network}.json`);
    console.log(`📝 Upgrade history saved to ./deployments/upgrade-history-${network}-${Date.now()}.json`);

    // For verification on BscScan
    console.log("\n🔍 For verification on BscScan:");
    console.log(`npx hardhat verify --network ${network} ${newImplementationAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });