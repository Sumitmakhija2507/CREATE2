import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Define a proper interface for the executors info
interface ExecutorInfo {
    status: boolean;
    updatedAt: string;
    updatedBy: string;
}

interface ExecutorsInfoMap {
    [address: string]: ExecutorInfo;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Setting executor with account:", deployer.address);

    // Load the deployment info from the deployments directory
    const network = process.env.HARDHAT_NETWORK || "local";
    const deploymentFile = path.join(__dirname, `../deployments/rapidx-deployment-${network}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error(`Deployment not found at ${deploymentFile}`);
        console.error("Please run deploy-rapidx.ts first");
        process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const proxyAddress = deploymentInfo.proxyAddress;

    if (!proxyAddress) {
        console.error("Proxy address not found in deployment info");
        process.exit(1);
    }

    console.log(`Using RapidX contract at: ${proxyAddress}`);

    // Get the contract instance
    const rapidx = await ethers.getContractAt("RapidX", proxyAddress);

    // Executor address to set
    const executorAddress = "0x4D9C1Ae0d1983Ce041358e6Db1aAf678C78CfA7d";
    const status = true;

    if (!executorAddress || !ethers.isAddress(executorAddress)) {
        console.error("Please provide a valid executor address as the first argument");
        console.error("Usage: npx hardhat run scripts/set-executor.ts --network <network> <executor_address> [true/false]");
        process.exit(1);
    }

    console.log(`Setting executor ${executorAddress} to status: ${status}`);

    try {
        // Check current status
        const currentStatus = await rapidx.executors(executorAddress);
        console.log(`Current executor status: ${currentStatus}`);

        // Set the executor status
        const tx = await rapidx.setExecutor(executorAddress, status);
        console.log("Transaction submitted:", tx.hash);

        // Wait for the transaction to be mined
        await tx.wait();
        console.log("✅ Executor status updated successfully!");

        // Verify the new status
        const newStatus = await rapidx.executors(executorAddress);
        console.log(`New executor status: ${newStatus}`);

        // Save the executor info to a JSON file
        const executorsFile = path.join(__dirname, `../deployments/rapidx-executors-${network}.json`);

        // Load existing executors or create new file
        let executorsInfo: ExecutorsInfoMap = {};
        if (fs.existsSync(executorsFile)) {
            executorsInfo = JSON.parse(fs.readFileSync(executorsFile, "utf8"));
        }

        // Update executors info
        executorsInfo[executorAddress] = {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: deployer.address
        };

        // Save to file
        fs.writeFileSync(
            executorsFile,
            JSON.stringify(executorsInfo, null, 2)
        );

        console.log(`📝 Executor info saved to ${executorsFile}`);

    } catch (error) {
        console.error("Error setting executor:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });