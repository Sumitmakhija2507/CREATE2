import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const [deployer, executor, user, attacker, sameAddressSigner] = await ethers.getSigners();
    console.log("Deploying CREATE3Factory with the account:", sameAddressSigner.address);

    // Get the current nonce
    const currentNonce = await sameAddressSigner.getNonce();
    console.log("Current nonce:", currentNonce);

    // Define the target nonce for deploying CREATE3Factory
    // This should be the same nonce used on all chains
    const targetNonce = 0; // Set this to your desired nonce

    // Check if current nonce matches the target
    if (currentNonce > targetNonce) {
        console.error(`Error: Current nonce (${currentNonce}) is higher than target nonce (${targetNonce})`);
        console.error("Cannot deploy CREATE3Factory at the same address");
        process.exit(1);
    }

    // If current nonce is lower, we need to increase it by sending dummy transactions
    if (currentNonce < targetNonce) {
        console.log(`Increasing nonce from ${currentNonce} to ${targetNonce}...`);

        // Send dummy transactions to increase nonce
        for (let i = currentNonce; i < targetNonce; i++) {
            console.log(`Sending dummy tx to increase nonce to ${i + 1}...`);
            const tx = await sameAddressSigner.sendTransaction({
                to: sameAddressSigner.address,
                value: ethers.parseEther("0"),
                gasLimit: 21000
            });
            await tx.wait();
        }

        // Verify the nonce was increased correctly
        const newNonce = await sameAddressSigner.getNonce();
        console.log(`Nonce increased to ${newNonce}`);

        if (newNonce !== targetNonce) {
            console.error(`Failed to set nonce correctly. Current: ${newNonce}, Target: ${targetNonce}`);
            process.exit(1);
        }
    }

    // Get the contract bytecode and factory
    const CREATE3Factory = await ethers.getContractFactory("CREATE3Factory", sameAddressSigner);

    // Deploy the factory with the correct nonce
    console.log(`Deploying CREATE3Factory with nonce ${targetNonce}...`);
    const factory = await CREATE3Factory.deploy();
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("CREATE3Factory deployed to:", factoryAddress);

    // Save deployment info to a JSON file
    const deploymentInfo = {
        factoryAddress: factoryAddress,
        deployedWithNonce: targetNonce
    };

    const network = process.env.HARDHAT_NETWORK || "local";
    const deploymentsDir = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `factory-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`Deployment info saved to ./deployments/factory-${network}.json`);

    // For verification on BscScan
    console.log("\nFor verification on BscScan:");
    console.log(`npx hardhat verify --network ${network} ${factoryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });