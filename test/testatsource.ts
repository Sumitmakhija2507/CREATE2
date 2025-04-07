const { ethers, network } = require("hardhat");

async function main() {
    try {


        const provider = ethers.provider;
        const signera = await ethers.getSigners();

        const signer = signera[1];


        console.log(signer.address);

        // Token contract details
        const tokenAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // Replace with correct token address
        const spenderAddress = "0x5401aE022578Df008b7962D956202A12aF72a602"; // The contract that will use the tokens
        const amount = ethers.parseUnits("100", 6); // Adjust amount and decimals as needed

        // Get the token contract instance
        const tokenABI = [
            "function approve(address spender, uint256 amount) public returns (bool)",
            "function allowance(address owner, address spender) public view returns (uint256)"
        ];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(signer.address, spenderAddress);
        console.log("Current allowance:", ethers.formatUnits(currentAllowance, 18));

        if (currentAllowance < amount) {
            console.log("Approving token allowance...");
            const approveTx = await tokenContract.approve(spenderAddress, amount);
            await approveTx.wait();
            console.log("Token allowance approved:", approveTx.hash);
        } else {
            console.log("Sufficient allowance already exists.");
        }

        // Transaction data
        const txData = {

            to: "0x5401aE022578Df008b7962D956202A12aF72a602",
            data: "0xfad099c900000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000085cd07ea01423b1e937929b44e4ad8c40bbb5e7100000000000000000000000000000000000000000000000000000000000551d000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000661626378797a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c4dd9c5f96000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000000000000000000000000000000000000000551d00000000000000000000000003d9907f9a368ad0a51be60f7da3b97cf940982d800000000000000000000000000000000000000000000000000023f84926c4fb9000000000000000000000000000000000000000000000000000239c33f09f2c30000000000000000000000000aec41448ba2441c450201c11ff47e50b8bd134300000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008802af88d065e77c8cc2239327c5edb3a432268e583101ffff00011f31d20c8778c8beb1093b73e3a5690ee6271b0085cd07ea01423b1e937929b44e4ad8c40bbb5e71000bb801912ce59144191c1204e64559fe8253a0e49e654801ffff01bfab133e05bf7291d75e1c852ed9aca510ee4fdc0085cd07ea01423b1e937929b44e4ad8c40bbb5e710000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            value: 0x0,

        };

        // Send transaction
        console.log("Sending transaction...");
        const txResponse = await signer.sendTransaction(txData);
        console.log("Transaction hash:", txResponse.hash);

        // Wait for transaction to be mined
        const receipt = await txResponse.wait();
        console.log("Transaction mined in block:", receipt.blockNumber);

        console.log("Transaction executed successfully");
    }
    catch (error) {
        console.log(error);
    }
}

// Run the script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });