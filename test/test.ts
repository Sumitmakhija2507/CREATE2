import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";

describe("ExampleContract UUPS Upgradeable Contract", function () {
    let examplecontractProxy: any;
    let owner: Signer;
    let user: Signer;
    let token: string;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();
        const ExampleContract = await ethers.getContractFactory("ExampleContract");
        examplecontractProxy = await upgrades.deployProxy(ExampleContract, [], { initializer: "initialize" });
        await examplecontractProxy.waitForDeployment();
    });

    it("should allow depositing ETH", async function () {
        const userAddress = await user.getAddress();
        const amount = ethers.parseEther("1");

        const tx = await examplecontractProxy.connect(user).depositETH("quote1", { value: amount });
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx)
            .to.emit(examplecontractProxy, "ETHDeposited")
            .withArgs(
                "quote1",
                userAddress,
                amount,
                block!.timestamp
            );
    });



    it("should allow the owner to set an executor", async function () {
        const userAddress = await user.getAddress();
        await examplecontractProxy.connect(owner).setExecutor(userAddress, true);

        // Verify the executor status
        expect(await examplecontractProxy.executors(userAddress)).to.be.true;
    });

    it("should allow the executor to transfer ETH", async function () {
        const userAddress = await user.getAddress();
        await examplecontractProxy.connect(owner).setExecutor(userAddress, true);

        const amount = ethers.parseEther("0.5");

        await examplecontractProxy.connect(owner).depositETH("quote2", { value: amount });

        await expect(
            examplecontractProxy.connect(user).transferETH("quote2", userAddress, amount)
        ).to.emit(examplecontractProxy, "SwapExecutedAtDestination")
            .withArgs("quote2", userAddress, true);
    });

    it("should not allow non-executors to transfer ETH", async function () {
        const amount = ethers.parseEther("1");
        await examplecontractProxy.connect(owner).depositETH("quote3", { value: amount });

        await expect(
            examplecontractProxy.connect(user).transferETH("quote3", await user.getAddress(), amount)
        ).to.be.revertedWith("Not an authorized executor");
    });
});