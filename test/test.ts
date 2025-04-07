import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";

describe("RapidX UUPS Upgradeable Contract", function () {
    let rapidXProxy: any;
    let owner: Signer;
    let user: Signer;
    let token: string;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();
        const RapidX = await ethers.getContractFactory("RapidX");
        rapidXProxy = await upgrades.deployProxy(RapidX, [], { initializer: "initialize" });
        await rapidXProxy.waitForDeployment();
    });

    it("should allow depositing ETH", async function () {
        const userAddress = await user.getAddress();
        const amount = ethers.parseEther("1");

        const tx = await rapidXProxy.connect(user).depositETH("quote1", { value: amount });
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
            .to.emit(rapidXProxy, "ETHDeposited")
            .withArgs(
                "quote1",
                userAddress,
                amount,
                block!.timestamp
            );
    });

    it("should allow depositing stablecoins", async function () {
        const userAddress = await user.getAddress();
        const MockToken = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockToken.deploy("Mock", "MCK");
        await mockToken.waitForDeployment();

        const amount = ethers.parseEther("10");
        await mockToken.mint(userAddress, amount);


        const tx = await rapidXProxy.connect(user).depositStableCoin("quote1", mockToken.target, amount);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
            .to.emit(rapidXProxy, "StableCoinDeposited")
            .withArgs(
                "quote1",
                userAddress,
                mockToken.target,
                amount,
                block!.timestamp
            );
    });

    it("should allow the owner to set an executor", async function () {
        const userAddress = await user.getAddress();
        await rapidXProxy.connect(owner).setExecutor(userAddress, true);

        // Verify the executor status
        expect(await rapidXProxy.executors(userAddress)).to.be.true;
    });

    it("should allow the executor to transfer ETH", async function () {
        const userAddress = await user.getAddress();
        await rapidXProxy.connect(owner).setExecutor(userAddress, true);

        const amount = ethers.parseEther("0.5");

        await rapidXProxy.connect(owner).depositETH("quote2", { value: amount });

        await expect(
            rapidXProxy.connect(user).transferETH("quote2", userAddress, amount)
        ).to.emit(rapidXProxy, "SwapExecutedAtDestination")
            .withArgs("quote2", userAddress, true);
    });

    it("should not allow non-executors to transfer ETH", async function () {
        const amount = ethers.parseEther("1");
        await rapidXProxy.connect(owner).depositETH("quote3", { value: amount });

        await expect(
            rapidXProxy.connect(user).transferETH("quote3", await user.getAddress(), amount)
        ).to.be.revertedWith("Not an authorized executor");
    });
});