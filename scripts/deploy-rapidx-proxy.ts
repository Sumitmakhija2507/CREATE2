import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying RapidX Proxy using CREATE3 with UUPS pattern...");

    const network = process.env.HARDHAT_NETWORK || "local";
    const implementationDeploymentFile = path.join(__dirname, `../deployments/implementation-${network}.json`);

    if (!fs.existsSync(implementationDeploymentFile)) {
        console.error(`Implementation deployment not found at ${implementationDeploymentFile}`);
        console.error("Please run deploy-rapidx-implementation.ts first");
        process.exit(1);
    }

    const implementationDeployment = JSON.parse(fs.readFileSync(implementationDeploymentFile, "utf8"));
    const factoryAddress = implementationDeployment.factoryAddress;
    const implementationAddress = implementationDeployment.implementationAddress;

    console.log("Using CREATE3Factory at:", factoryAddress);
    console.log("Using RapidX Implementation at:", implementationAddress);

    const factory = await ethers.getContractAt("ICREATE3Factory", factoryAddress);


    // Create initialization data
    const RapidX = await ethers.getContractFactory("RapidX");
    const initializerData = RapidX.interface.encodeFunctionData("initialize", []);

    // Create proxy bytecode with constructor arguments
    const proxyBytecode = ethers.concat([
        RapidX.bytecode,
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "bytes"],
            [implementationAddress, initializerData]
        ),
    ]);

    // Deploy using CREATE3
    const proxySalt = ethers.id("RAPIDX_PROXY_V1");
    console.log("Deploying UUPS Proxy with CREATE3...");

    const proxyTx = await factory.deploy(proxySalt, proxyBytecode, { gasLimit: 5000000 });
    await proxyTx.wait();

    // Get deployed proxy address
    const proxyAddress = await factory.getDeployed(deployer.address, proxySalt);
    console.log("✅ Proxy deployed at:", proxyAddress);

    // Verify ownership
    const rapidx = await ethers.getContractAt("RapidX", proxyAddress);
    const owner = await rapidx.owner();

    if (owner === deployer.address) {
        console.log("✅ Deployment successful!");
    } else {
        console.log("⚠️ Owner mismatch. Check the deployment.");
    }

    // Save deployment details
    const deploymentInfo = {
        factoryAddress,
        implementationAddress,
        proxyAddress,
        proxySalt,
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

    fs.writeFileSync(
        path.join(deploymentsDir, `proxy-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`Deployment info saved to ./deployments/proxy-${network}.json`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });