import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [CREATE2_DEPLOYER, SMART_CONTRACT_DEPLOYER, executor, user, attacker] = await ethers.getSigners();

    const deployer = CREATE2_DEPLOYER;

    console.log("Deploying CREATE2Factory with the account:", deployer.address);

    // Deploy the CREATE2Factory contract
    const CREATE2Factory = await ethers.getContractFactory("CREATE2Factory");
    const factory = await CREATE2Factory.deploy();
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("CREATE2Factory deployed to:", factoryAddress);

    // Save deployment information
    const network = process.env.HARDHAT_NETWORK || "local";
    const deploymentsDir = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentInfo = {
        factoryAddress,
        deployedBy: deployer.address,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(deploymentsDir, `create2-factory-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`✅ Deployment info saved to ./deployments/create2-factory-${network}.json`);

    // Optional: verification command output
    console.log("\n🔍 To verify on block explorer:");
    console.log(`npx hardhat verify --network ${network} ${factoryAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});