import { exec } from "child_process";
import { promisify } from "util";
import { network } from "hardhat";

const execAsync = promisify(exec);

async function main() {
        // Get network from command-line arguments
        const args = process.argv.slice(2);
        const networkName = network.name;

        console.log(`Starting complete deployment process on network: ${networkName}...`);

        try {

                console.log(`\n1. Deploying CREATE2Factory on ${networkName}...`);
                const factoryResult = await execAsync(`npx hardhat run scripts/deploy-create2-factory.ts --network ${networkName}`);
                console.log(factoryResult.stdout);
                if (factoryResult.stderr) console.error(factoryResult.stderr);


                console.log(`\n1. Deploying ExampleContract on ${networkName}...`);
                const deploy = await execAsync(`npx hardhat run scripts/deploy.ts --network ${networkName}`);
                console.log(deploy.stdout);
                if (deploy.stderr) console.error(deploy.stderr);


                console.log(`\n✅ Complete deployment process finished successfully on ${network}!`);
        } catch (error) {
                console.error("Deployment failed:", error);
                process.exit(1);
        }
}

main()
        .then(() => process.exit(0))
        .catch((error) => {
                console.error(error);
                process.exit(1);
        });