import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";

describe("RapidX UUPS Upgradeable Contract", function () {
    let rapidXProxy: any;
    let signer: Signer;
    let mockToken: any;

    before(async function () {
        // Increase timeout for network operations
        this.timeout(100000);


        // Get the first (and only) signer
        const signers = await ethers.getSigners();
        signer = signers[0];

        // Verify signer address
        const signerAddress = await signer.getAddress();
        console.log("Signer Address:", signerAddress);

        // Deploy Mock Token
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await MockToken.deploy("RapidX Mock", "RPMX");
        await mockToken.waitForDeployment();
        console.log("Mock Token Deployed at:", mockToken.target);

        // Deploy RapidX Contract
        const RapidX = await ethers.getContractFactory("RapidX");
        rapidXProxy = await upgrades.deployProxy(RapidX, [], { initializer: "initialize" });
        await rapidXProxy.waitForDeployment();
        console.log("RapidX Proxy Deployed at:", rapidXProxy.target);

    });

    it("should allow depositing ETH", async function () {
        const signerAddress = await signer.getAddress();
        const amount = ethers.parseEther("0.000001");

        const tx = await rapidXProxy.connect(signer).depositETH("quote1", { value: amount });
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
            .to.emit(rapidXProxy, "ETHDeposited")
            .withArgs(
                "quote1",
                signerAddress,
                amount,
                block!.timestamp
            );
    });

    it("should allow depositing stablecoins", async function () {
        const signerAddress = await signer.getAddress();
        const amount = ethers.parseEther("10");

        // Mint tokens to signer
        await mockToken.mint(signerAddress, amount);

        // Approve contract to spend tokens
        await mockToken.connect(signer).approve(rapidXProxy.target, amount);

        const tx = await rapidXProxy.connect(signer).depositStableCoin(
            "quote1",
            mockToken.target,
            amount
        );
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
            .to.emit(rapidXProxy, "StableCoinDeposited")
            .withArgs(
                "quote1",
                signerAddress,
                mockToken.target,
                amount,
                block!.timestamp
            );
    });

    it("should allow setting an executor", async function () {
        const signerAddress = await signer.getAddress();

        await expect(rapidXProxy.connect(signer).setExecutor(signerAddress, true))
            .to.not.be.reverted;

        // Verify the executor status
        expect(await rapidXProxy.executors(signerAddress)).to.be.true;
    });

    it("should allow the executor to transfer ETH", async function () {
        const signerAddress = await signer.getAddress();

        // Deposit some ETH first
        const depositAmount = ethers.parseEther("0.00001");
        await rapidXProxy.connect(signer).depositETH("quote2", { value: depositAmount });

        // Transfer ETH
        await expect(
            rapidXProxy.connect(signer).transferETH("quote2", signerAddress, depositAmount)
        ).to.emit(rapidXProxy, "SwapExecutedAtDestination")
            .withArgs("quote2", signerAddress, true);
    });
});