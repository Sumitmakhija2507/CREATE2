import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";



describe("Withdraw Stablecoin", function () {
    const CONTRACT_ADDRESS = "0x80799bBAF098362Eb275912eeAA696f9bF29dB1D";
    let owner: any;
    let contract: any;

    before(async function () {
        // Get signers
        [owner] = await ethers.getSigners();

        // ABI for interacting with the contract
        const ABI = [
            "function adminWithdrawStablecoin(address token, address to, uint256 amount) external"
        ];

        // Connect to the deployed contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, owner);
    });

    it("should withdraw stablecoin successfully", async function () {
        const tokenAddress = "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"; // Replace with actual stablecoin address
        const recipient = "0x0AEc41448bA2441C450201c11FF47e50b8Bd1343"; // Replace with recipient address
        const amount = ethers.parseUnits("0.05", 18); // Adjust decimal places

        // Send transaction
        const tx = await contract.adminWithdrawStablecoin(tokenAddress, recipient, amount);
        await tx.wait();

        console.log("Transaction Hash:", tx.hash);

        expect(tx).to.not.be.undefined;
    });
});