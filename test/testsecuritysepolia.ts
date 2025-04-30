import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";
import { BigNumberish, ContractTransaction, resolveAddress, parseEther } from 'ethers';
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("RapidX Security Tests", function () {
    let rapidXProxy: any;
    let rapidXImplementation: any;
    let rapidXV2: any;
    let owner: Signer;
    let executor: Signer;
    let attacker: Signer;
    let user: Signer;
    let mockToken: any;
    let mockDex: any;

    before(async function () {
        this.timeout(100000);

        const signers = await ethers.getSigners();
        owner = signers[0];
        executor = signers[1];
        user = signers[2];
        attacker = signers[3];

        // Deploy mock token
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await MockToken.deploy("RapidX Mock", "RPMX");
        await mockToken.waitForDeployment();

        // Deploy mock DEX
        const MockDex = await ethers.getContractFactory("MockDex");
        mockDex = await MockDex.deploy();
        await mockDex.waitForDeployment();

        // Deploy RapidX contract
        const RapidX = await ethers.getContractFactory("RapidX");
        rapidXProxy = await upgrades.deployProxy(RapidX, [], { initializer: "initialize" });
        await rapidXProxy.waitForDeployment();

        // Get implementation address
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(rapidXProxy.target);
        rapidXImplementation = RapidX.attach(implementationAddress);

        // Set executor
        await rapidXProxy.connect(owner).setExecutor(await executor.getAddress(), true);

        // Fund user with tokens
        await mockToken.mint(await user.getAddress(), ethers.parseEther("1000"));
        await mockToken.connect(user).approve(rapidXProxy.target, ethers.parseEther("1000"));
    });

    describe("Access Control Tests", function () {
        it("should prevent non-owners from setting executors", async function () {
            await expect(
                rapidXProxy.connect(attacker).setExecutor(await attacker.getAddress(), true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should prevent non-executors from executing privileged functions", async function () {
            await expect(
                rapidXProxy.connect(attacker).transferNative("quote1", await user.getAddress(), ethers.parseEther("0.1"))
            ).to.be.revertedWith("Not an authorized executor");

            await expect(
                rapidXProxy.connect(attacker).transferStableCoin(
                    "quote1",
                    mockToken.target,
                    await user.getAddress(),
                    ethers.parseEther("0.00001")
                )
            ).to.be.revertedWith("Not an authorized executor");

            await expect(
                rapidXProxy.connect(attacker).swapWithDexesAtSource(
                    "quote1",
                    mockToken.target,
                    mockDex.target,
                    ethers.parseEther("0.00001"),
                    "0x"
                )
            ).to.be.revertedWith("Not an authorized executor");
        });

        it("should prevent non-owners from upgrading the contract", async function () {
            const RapidXV2 = await ethers.getContractFactory("RapidX");
            await expect(
                upgrades.upgradeProxy(rapidXProxy.target, RapidXV2.connect(attacker))
            ).to.be.reverted;
        });
    });

    describe("Reentrancy Protection Tests", function () {
        it("should prevent reentrancy attacks on Native deposits", async function () {
            // Define interface for attacker contract
            interface ReentrancyAttackerInterface {
                attack(quoteId: string, options?: { value: BigNumberish }): Promise<ContractTransaction>;
            }

            // Deploy a malicious contract that attempts reentrancy
            const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
            const attackerContract = (await ReentrancyAttacker.deploy(rapidXProxy.target)) as unknown as ReentrancyAttackerInterface;

            // Fund the attacker contract
            await owner.sendTransaction({
                to: await ethers.resolveAddress(attackerContract as any),
                value: ethers.parseEther("0.00001")
            });

            // Attempt the attack
            await expect(
                attackerContract.attack("quote1", { value: ethers.parseEther("0.00001") })
            ).to.be.reverted;
        });
    });

    describe("Edge Case Tests", function () {
        it("should prevent deposits with zero amounts", async function () {
            await expect(
                rapidXProxy.connect(user).depositNative("quote1", { value: 0 })
            ).to.be.revertedWith("Must send Native");

            await expect(
                rapidXProxy.connect(user).depositStableCoin("quote1", mockToken.target, 0)
            ).to.be.revertedWith("Must deposit some tokens");
        });

        it("should prevent transfers to the zero address", async function () {
            // First deposit some funds
            await rapidXProxy.connect(user).depositNative("quote1", { value: ethers.parseEther("0.00001") });

            await expect(
                rapidXProxy.connect(executor).transferNative("quote1", ethers.ZeroAddress, ethers.parseEther("0.00001"))
            ).to.be.revertedWith("Invalid recipient address");

            await expect(
                rapidXProxy.connect(executor).transferStableCoin(
                    "quote1",
                    mockToken.target,
                    ethers.ZeroAddress,
                    ethers.parseEther("0.00001")
                )
            ).to.be.revertedWith("Invalid recipient address");
        });

        it("should prevent operations with invalid token addresses", async function () {
            await expect(
                rapidXProxy.connect(user).depositStableCoin("quote1", ethers.ZeroAddress, ethers.parseEther("0.00001"))
            ).to.be.revertedWith("Invalid token address");
        });
    });

    describe("Transfer and Swap Tests", function () {
        it("should prevent transfers exceeding contract balances", async function () {
            const excessiveAmount = ethers.parseEther("1000");

            await expect(
                rapidXProxy.connect(executor).transferNative("quote1", await user.getAddress(), excessiveAmount)
            ).to.be.revertedWith("Insufficient contract balance");

            await expect(
                rapidXProxy.connect(executor).transferStableCoin(
                    "quote1",
                    mockToken.target,
                    await user.getAddress(),
                    excessiveAmount
                )
            ).to.be.revertedWith("Insufficient contract balance");
        });

        it("should verify DEX swap parameters", async function () {
            await expect(
                rapidXProxy.connect(executor).swapWithDexesAtDestination(
                    "quote1",
                    mockToken.target,
                    ethers.ZeroAddress,
                    ethers.parseEther("0.00001"),
                    "0x"
                )
            ).to.be.revertedWith("Invalid DEX address");

            await expect(
                rapidXProxy.connect(executor).swapWithDexesAtDestination(
                    "quote1",
                    ethers.ZeroAddress,
                    mockDex.target,
                    ethers.parseEther("0.00001"),
                    "0x"
                )
            ).to.be.revertedWith("Invalid token address");

            await expect(
                rapidXProxy.connect(executor).swapWithDexesAtDestination(
                    "quote1",
                    mockToken.target,
                    mockDex.target,
                    0,
                    "0x"
                )
            ).to.be.revertedWith("Amount must be greater than zero");
        });
    });

    describe("Upgrade Security Tests", function () {
        it("should correctly implement the upgrade pattern", async function () {
            // Create a new implementation
            const RapidXV2 = await ethers.getContractFactory("RapidX");

            // Upgrade to the new implementation
            rapidXV2 = await upgrades.upgradeProxy(rapidXProxy.target, RapidXV2);

            // Verify the implementation address has changed
            const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(rapidXProxy.target);
            expect(newImplementationAddress).to.not.equal(rapidXImplementation.target);

            // Verify state persistence after upgrade
            expect(await rapidXV2.executors(await executor.getAddress())).to.be.true;
        });
    });

    describe("Withdrawal and Admin Functions", function () {
        it("should allow only the owner to withdraw funds", async function () {
            // Fund the contract with ETH
            await owner.sendTransaction({
                to: rapidXProxy.target,
                value: ethers.parseEther("1")
            });

            // Fund the contract with tokens
            await mockToken.mint(rapidXProxy.target, ethers.parseEther("100"));

            // Non-owner should not be able to withdraw
            await expect(
                rapidXProxy.connect(attacker).adminWithdrawNative(
                    await attacker.getAddress(),
                    ethers.parseEther("0.00001")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                rapidXProxy.connect(attacker).adminWithdrawStablecoin(
                    mockToken.target,
                    await attacker.getAddress(),
                    ethers.parseEther("10")
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");

            // Owner should be able to withdraw
            await expect(
                rapidXProxy.connect(owner).adminWithdrawNative(
                    await owner.getAddress(),
                    ethers.parseEther("0.00001")
                )
            ).to.emit(rapidXProxy, "AdminWithdrawNative");

            await expect(
                rapidXProxy.connect(owner).adminWithdrawStablecoin(
                    mockToken.target,
                    await owner.getAddress(),
                    ethers.parseEther("10")
                )
            ).to.emit(rapidXProxy, "AdminWithdrawStablecoin");
        });
    });

    describe("Event Correctness Tests", function () {
        it("should emit correct events with proper parameters", async function () {
            const quoteId = "testQuote123";
            const amount = ethers.parseEther("0.00001");
            const userAddress = await user.getAddress();

            // Test ETH deposit event
            const depositTx = await rapidXProxy.connect(user).depositNative(quoteId, { value: amount });
            const receipt = await depositTx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(depositTx)
                .to.emit(rapidXProxy, "NativeDeposited")
                .withArgs(quoteId, userAddress, amount, block!.timestamp);

            // Test stablecoin deposit event
            const stableTx = await rapidXProxy.connect(user).depositStableCoin(
                quoteId,
                mockToken.target,
                amount
            );
            const stableReceipt = await stableTx.wait();
            const stableBlock = await ethers.provider.getBlock(stableReceipt.blockNumber);

            await expect(stableTx)
                .to.emit(rapidXProxy, "StableCoinDeposited")
                .withArgs(quoteId, userAddress, mockToken.target, amount, stableBlock!.timestamp);
        });
    });
});
