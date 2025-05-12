import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
        try {

                const [CREATE2_DEPLOYER, SMART_CONTRACT_DEPLOYER, executor, user, attacker] = await ethers.getSigners();

                const deployer = SMART_CONTRACT_DEPLOYER;

                console.log("Deploying ExampleContract (Implementation + Proxy) with account:", deployer.address);

                // Load the factory address from deployments
                const network = process.env.HARDHAT_NETWORK || "local";
                const factoryDeploymentFile = path.join(__dirname, `../deployments/create2-factory-${network}.json`);
                if (!fs.existsSync(factoryDeploymentFile)) {
                        console.error(`CREATE2Factory deployment not found at ${factoryDeploymentFile}`);
                        console.error("Please deploy the CREATE2Factory first");
                        process.exit(1);
                }

                const factoryDeployment = JSON.parse(fs.readFileSync(factoryDeploymentFile, "utf8"));
                const factoryAddress = factoryDeployment.factoryAddress;
                console.log("Using CREATE2Factory at:", factoryAddress);
                const factory = await ethers.getContractAt("CREATE2Factory", factoryAddress);

                // Step 1: Deploy the ExampleContract implementation
                console.log("\n📄 Deploying ExampleContract implementation with CREATE2...");
                const ExampleContract = await ethers.getContractFactory("ExampleContract");
                const implementationBytecode = ExampleContract.bytecode;

                // Choose a salt for deterministic addressing
                const implementationSaltString = "EXAMPLECONTRACT_IMPLEMENTATION";
                const implementationSalt = ethers.keccak256(
                        ethers.toUtf8Bytes(implementationSaltString)
                );

                // Calculate expected implementation address
                const implementationBytecodeHash = ethers.keccak256(implementationBytecode);
                const expectedImplementationAddress = await factory.getDeployed(
                        deployer.address,
                        implementationSalt,
                        implementationBytecodeHash
                );

                console.log("🔑 Using implementation salt:", implementationSaltString);


                // Check if implementation is already deployed
                const implementationCode = await ethers.provider.getCode(expectedImplementationAddress);
                let implementationAddress;

                if (implementationCode !== "0x") {
                        console.log("⚠️ Implementation already deployed at", expectedImplementationAddress);
                        implementationAddress = expectedImplementationAddress;
                } else {
                        // Deploy the implementation with CREATE2
                        const implementationTx = await factory.deploy(
                                implementationSalt,
                                implementationBytecode,
                                { gasLimit: 5000000 }
                        );

                        const implementationReceipt = await implementationTx.wait();

                        // Fix: Check if receipt is null before accessing its properties
                        if (implementationReceipt === null) {
                                throw new Error("Failed to get transaction receipt for implementation deployment");
                        }

                        // Extract deployed address from event
                        let found = false;
                        for (const log of implementationReceipt.logs) {
                                try {
                                        const parsedLog = factory.interface.parseLog(log);
                                        if (parsedLog && parsedLog.name === "Deployed") {
                                                implementationAddress = parsedLog.args[1]; // 'deployed' argument
                                                found = true;
                                                break;
                                        }
                                } catch (e) {
                                        continue;
                                }
                        }

                        if (!found) {
                                console.log("⚠️ Couldn't extract address from logs, using expected address");
                                implementationAddress = expectedImplementationAddress;
                        }

                        console.log("✅ Implementation deployed at:", implementationAddress);
                        console.log("   Address matches expected:",
                                implementationAddress.toLowerCase() === expectedImplementationAddress.toLowerCase() ? '✅' : '❌');
                }

                // Step 2: Deploy the UUPS Proxy with CREATE2
                console.log("\n🔄 Deploying UUPS Proxy with CREATE2...");

                // Get the ERC1967Proxy contract factory
                const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");

                // Create initialization data for the proxy
                const initializerData = ExampleContract.interface.encodeFunctionData("initialize", [deployer.address]);

                // Create the proxy bytecode with constructor arguments
                const proxyBytecode = ERC1967Proxy.bytecode +
                        ethers.AbiCoder.defaultAbiCoder().encode(
                                ["address", "bytes"],
                                [implementationAddress, initializerData]
                        ).slice(2); // Remove '0x' prefix

                // Choose a salt for the proxy
                const proxySaltString = "EXAMPLECONTRACT_PROXY";
                const proxySalt = ethers.keccak256(
                        ethers.toUtf8Bytes(proxySaltString)
                );

                // Calculate expected proxy address
                const proxyBytecodeHash = ethers.keccak256(proxyBytecode);
                const expectedProxyAddress = await factory.getDeployed(
                        deployer.address,
                        proxySalt,
                        proxyBytecodeHash
                );

                console.log("🔑 Using proxy salt:", proxySaltString);


                // Check if proxy is already deployed
                const proxyCode = await ethers.provider.getCode(expectedProxyAddress);
                let proxyAddress;

                if (proxyCode !== "0x") {
                        console.log("⚠️ Proxy already deployed at", expectedProxyAddress);
                        proxyAddress = expectedProxyAddress;
                } else {
                        // Deploy the proxy with CREATE2
                        const proxyTx = await factory.deploy(
                                proxySalt,
                                proxyBytecode,
                                { gasLimit: 5000000 }
                        );

                        const proxyReceipt = await proxyTx.wait();

                        // Fix: Check if receipt is null before accessing its properties
                        if (proxyReceipt === null) {
                                throw new Error("Failed to get transaction receipt for proxy deployment");
                        }

                        // Extract deployed address from event
                        let found = false;
                        for (const log of proxyReceipt.logs) {
                                try {
                                        const parsedLog = factory.interface.parseLog(log);
                                        if (parsedLog && parsedLog.name === "Deployed") {
                                                proxyAddress = parsedLog.args[1]; // 'deployed' argument
                                                found = true;
                                                break;
                                        }
                                } catch (e) {
                                        continue;
                                }
                        }

                        if (!found) {
                                console.log("⚠️ Couldn't extract address from logs, using expected address");
                                proxyAddress = expectedProxyAddress;
                        }

                        console.log("✅ Proxy deployed at:", proxyAddress);
                        console.log("   Address matches expected:",
                                proxyAddress.toLowerCase() === expectedProxyAddress.toLowerCase() ? '✅' : '❌');
                }

                // Verify ownership
                const exampleContract = await ethers.getContractAt("ExampleContract", proxyAddress);

                try {
                        const owner = await exampleContract.owner();
                        console.log("Contract owner:", owner);

                        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                                console.log("✅ Deployment successful! Owner correctly set.");
                        } else {
                                console.log("⚠️ Owner mismatch. Check the deployment.");
                                console.log("Expected owner:", deployer.address);
                        }
                } catch (error) {
                        console.log("⚠️ Error checking owner. Contract might need initialization.");

                        if (proxyCode !== "0x") {
                                console.log("🔧 Attempting to initialize proxy...");
                                try {
                                        const initTx = await exampleContract.initialize(deployer.address);
                                        await initTx.wait();
                                        console.log("✅ Contract initialized successfully!");

                                        const owner = await exampleContract.owner();
                                        console.log("Contract owner after initialization:", owner);
                                } catch (initError) {
                                        // Fix: Properly type the error
                                        const errorMessage = initError instanceof Error ? initError.message : String(initError);
                                        console.error("❌ Failed to initialize:", errorMessage);
                                }
                        }
                }

                // Save deployment info to a JSON file
                const deploymentInfo = {
                        network,
                        factoryAddress,
                        implementation: {
                                address: implementationAddress,
                                saltString: implementationSaltString,
                                salt: implementationSalt
                        },
                        proxy: {
                                address: proxyAddress,
                                saltString: proxySaltString,
                                salt: proxySalt
                        },
                        owner: deployer.address,
                        deploymentDate: new Date().toISOString()
                };

                const deploymentsDir = path.join(__dirname, "../deployments");
                if (!fs.existsSync(deploymentsDir)) {
                        fs.mkdirSync(deploymentsDir, { recursive: true });
                }

                fs.writeFileSync(
                        path.join(deploymentsDir, `examplecontract-create2-${network}.json`),
                        JSON.stringify(deploymentInfo, null, 2)
                );

                console.log(`\n📝 Deployment info saved to ./deployments/examplecontract-create2-${network}.json`);

                // For verification on block explorer
                console.log("\n🔍 For verification on block explorer:");
                console.log(`npx hardhat verify --network ${network} ${implementationAddress}`);
        }
        catch (error) {
                console.error("Deployment failed:", error);
        }
}

main()
        .then(() => process.exit(0))
        .catch((error) => {
                console.error(error);
                process.exit(1);
        });