import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading ExampleContract Implementation with account:", deployer.address);

    const network = process.env.HARDHAT_NETWORK || "local";
    const proxyDeploymentFile = path.join(__dirname, `../deployments/proxy-${network}.json`);

    if (!fs.existsSync(proxyDeploymentFile)) {
        console.error(`Proxy deployment not found at ${proxyDeploymentFile}`);
        console.error("Please run deploy-examplecontract-proxy.ts first");
        process.exit(1);
    }

    const proxyDeployment = JSON.parse(fs.readFileSync(proxyDeploymentFile, "utf8"));
    const proxyAddress = proxyDeployment.proxyAddress;
    const oldImplementationAddress = proxyDeployment.implementationAddress;

    // 👇 Replace with actual deployed Create2Deployer address
    const create2DeployerAddress = proxyDeployment.create2DeployerAddress;

    console.log("Using Create2Deployer at:", create2DeployerAddress);
    console.log("Current proxy at:", proxyAddress);
    console.log("Current implementation at:", oldImplementationAddress);

    const ExampleContract = await ethers.getContractFactory("ExampleContract");
    const bytecode = ExampleContract.bytecode;

    const salt = ethers.id("EXAMPLECONTRACT_IMPLEMENTATION_V2");

    const create2Deployer = await ethers.getContractAt("Create2Deployer", create2DeployerAddress);

    // Predict address
    const bytecodeHash = ethers.keccak256(bytecode);
    const predictedAddress = ethers.getCreate2Address(
        create2DeployerAddress,
        salt,
        bytecodeHash
    );

    console.log("\n📄 Deploying new ExampleContract implementation via CREATE2...");
    const tx = await create2Deployer.deploy(salt, bytecode, { gasLimit: 5000000 });
    await tx.wait();

    console.log("✅ New ExampleContract implementation deployed to:", predictedAddress);

    const UUPS_INTERFACE = [
        "function upgradeTo(address newImplementation) external",
        "function owner() external view returns (address)"
    ];

    const proxy = new ethers.Contract(proxyAddress, UUPS_INTERFACE, deployer);

    const owner = await proxy.owner();
    if (owner !== deployer.address) {
        console.error(`You are not the owner of the contract. Current owner is ${owner}`);
        process.exit(1);
    }

    console.log("\n🔄 Upgrading proxy implementation...");
    const upgradeTx = await proxy.upgradeTo(predictedAddress);
    await upgradeTx.wait();

    console.log("✅ Proxy implementation upgraded successfully!");

    const upgradeInfo = {
        ...proxyDeployment,
        previousImplementationAddress: oldImplementationAddress,
        implementationAddress: predictedAddress,
        implementationSalt: salt.toString(),
        upgradeDate: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `proxy-${network}.json`),
        JSON.stringify(upgradeInfo, null, 2)
    );

    fs.writeFileSync(
        path.join(deploymentsDir, `upgrade-history-${network}-${Date.now()}.json`),
        JSON.stringify(upgradeInfo, null, 2)
    );

    console.log(`\n📝 Upgrade info saved to ./deployments/proxy-${network}.json`);
    console.log(`📝 Upgrade history saved to ./deployments/upgrade-history-${network}-${Date.now()}.json`);

    console.log("\n🔍 For verification on BscScan:");
    console.log(`npx hardhat verify --network ${network} ${predictedAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});