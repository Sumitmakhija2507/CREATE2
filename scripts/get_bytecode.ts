import { promises as fs } from "fs";
import path from "path";

async function main() {
    const contractName = "ExampleContract"; // Replace with your contract name
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);

    const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
    const bytecode = artifact.bytecode;

    console.log(`📌 Bytecode for ${contractName}:`);
    console.log(bytecode);
}

main().catch((error) => {
    console.error("❌ Error fetching bytecode:", error);
    process.exit(1);
});