const fs = require("fs");
const path = require("path");

// Load ABI
const abiPath = path.join(__dirname, "../artifacts/contracts/RapidX.sol/RapidX.json");

try {
    const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = contractJson.abi; // Extract ABI

    console.log("Contract ABI:", JSON.stringify(abi, null, 2));
} catch (error) {
    console.error("Error loading ABI:", error);
}