// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RapidX is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    
    mapping(address => bool) public executors;

    // Define custom errors for more gas-efficient and detailed error reporting
    error ZeroAmount();
    error InvalidDexAddress();
    error InvalidTokenAddress();
    error TokenTransferFailed();
    error TokenApprovalFailed();
    error DexCallFailed(string reason);
    error DexCallFailedBytes(bytes data);
    error DexCallFailedNoData();
    error InvalidRecipientAddress();
    error InsufficientContractBalance();
    error NotAuthorizedExecutor();
    error EthTransferFailed();

    // Events with indexed parameters for more efficient filtering
    event NativeDeposited(
        string indexed quoteId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event StableCoinDeposited(
        string indexed quoteId,
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event SwapExecutedAtSource(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event TransferNative(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event TransferStableCoin(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event SwapExecutedAtSourceNative(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event SwapExecutedAtDestination(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event SwapExecutedAtDestinationNative(
        string indexed quoteId,
        address indexed user,
        bool success,
        uint256 timestamp
    );

    event AdminWithdrawNative(address indexed to, uint256 amount, uint256 timestamp);
    event AdminWithdrawStablecoin(
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyExecutor() {
        if (!executors[msg.sender]) revert NotAuthorizedExecutor();
        _;
    }

    function initialize(address owner) public initializer {
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setExecutor(address _executor, bool _status) external onlyOwner {
        if (_executor == address(0)) revert InvalidRecipientAddress();
        executors[_executor] = _status;
    }

    function depositNative(string calldata quoteId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        emit NativeDeposited(quoteId, msg.sender, msg.value, block.timestamp);
    }

    function depositStableCoin(
        string calldata quoteId,
        address token,
        uint256 amount
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert InvalidTokenAddress();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit StableCoinDeposited(
            quoteId,
            msg.sender,
            token,
            amount,
            block.timestamp
        );
    }

    function transferNative(
        string calldata quoteId,
        address to,
        uint256 amount
    ) external nonReentrant onlyExecutor {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (amount == 0) revert ZeroAmount();
        
        // More efficient balance check
        uint256 contractBalance = address(this).balance;
        if (contractBalance < amount) revert InsufficientContractBalance();

        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert EthTransferFailed();

        emit TransferNative(quoteId, to, success, block.timestamp);
    }

    function transferStableCoin(
        string calldata quoteId,
        address token,
        address to,
        uint256 amount
    ) external nonReentrant onlyExecutor {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert InvalidTokenAddress();
        
        IERC20 tokenContract = IERC20(token);
        uint256 contractBalance = tokenContract.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientContractBalance();

        // Using SafeERC20 for safer transfers
        tokenContract.safeTransfer(to, amount);

        emit TransferStableCoin(quoteId, to, true, block.timestamp);
    }

    // Improved DEX error handling function
    function _handleDexCallError(bool success, bytes memory returnData) internal pure {
        if (!success) {
            if (returnData.length > 0) {
                // Try to extract standard revert reason
                if (returnData.length > 4) {
                    // Standard Error format (0x08c379a0)
                    bytes4 selector = bytes4(returnData[0]) | 
                                    (bytes4(returnData[1]) >> 8) | 
                                    (bytes4(returnData[2]) >> 16) | 
                                    (bytes4(returnData[3]) >> 24);
                    
                    if (selector == 0x08c379a0) {
                        // More efficient string extraction
                        string memory reason;
                        assembly {
                            // Skip selector and data offset (4 + 32 bytes)
                            let reasonOffset := add(returnData, 36)
                            // Get string length
                            let reasonLength := mload(reasonOffset)
                            // Get string content (skip length word)
                            reason := add(reasonOffset, 32)
                            // Update reason with proper length
                            mstore(reason, reasonLength)
                        }
                        revert DexCallFailed(reason);
                    }
                }
                // If not standard format, return raw data
                revert DexCallFailedBytes(returnData);
            }
            // No error data
            revert DexCallFailedNoData();
        }
    }

    function swapWithDexesAtSource(
        string calldata quoteId,
        address token,
        address dexAddress,
        uint256 amount,
        bytes calldata callData
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (dexAddress == address(0)) revert InvalidDexAddress();
        if (token == address(0)) revert InvalidTokenAddress();

        // Transfer tokens with better error handling
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);

        // Approve DEX to use tokens
        bool approved = tokenContract.approve(dexAddress, amount);
        if (!approved) revert TokenApprovalFailed();

        // Make the external call
        (bool success, bytes memory returnData) = dexAddress.call(callData);
        
        // Unified error handling
        _handleDexCallError(success, returnData);

        // Log the successful swap
        emit SwapExecutedAtSource(quoteId, msg.sender, success, block.timestamp);
    }

    function swapWithDexesAtDestination(
        string calldata quoteId,
        address token,
        address dexAddress,
        uint256 amount,
        bytes calldata callData
    ) external nonReentrant onlyExecutor {
        if (amount == 0) revert ZeroAmount();
        if (dexAddress == address(0)) revert InvalidDexAddress();
        if (token == address(0)) revert InvalidTokenAddress();

        IERC20 tokenContract = IERC20(token);
        if (tokenContract.balanceOf(address(this)) < amount) revert InsufficientContractBalance();

        // Approve DEX to use tokens
        bool approved = tokenContract.approve(dexAddress, amount);
        if (!approved) revert TokenApprovalFailed();
        
        // Execute swap
        (bool success, bytes memory returnData) = dexAddress.call(callData);
        
        // Unified error handling
        _handleDexCallError(success, returnData);

        emit SwapExecutedAtDestination(quoteId, msg.sender, success, block.timestamp);
    }

    function swapWithDexesAtSourceNative(
        string calldata quoteId,
        address dexAddress,
        bytes calldata callData
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (dexAddress == address(0)) revert InvalidDexAddress();

        (bool success, bytes memory returnData) = dexAddress.call{value: msg.value}(callData);
        
        // Unified error handling
        _handleDexCallError(success, returnData);

        emit SwapExecutedAtSourceNative(quoteId, msg.sender, success, block.timestamp);
    }

    function swapWithDexesAtDestinationNative(
        string calldata quoteId,
        address dexAddress,
        bytes calldata callData
    ) external payable nonReentrant onlyExecutor {
        if (msg.value == 0) revert ZeroAmount();
        if (dexAddress == address(0)) revert InvalidDexAddress();
        if (address(this).balance < msg.value) revert InsufficientContractBalance();

        (bool success, bytes memory returnData) = dexAddress.call{value: msg.value}(callData);
        
        // Unified error handling
        _handleDexCallError(success, returnData);

        emit SwapExecutedAtDestinationNative(quoteId, msg.sender, success, block.timestamp);                     
    }

    function adminWithdrawNative(
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (address(this).balance < amount) revert InsufficientContractBalance();

        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert EthTransferFailed();
        
        emit AdminWithdrawNative(to, amount, block.timestamp);
    }

    function adminWithdrawStablecoin(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (token == address(0)) revert InvalidTokenAddress();
        
        IERC20 tokenContract = IERC20(token);
        if (tokenContract.balanceOf(address(this)) < amount) revert InsufficientContractBalance();

        tokenContract.safeTransfer(to, amount);
        emit AdminWithdrawStablecoin(to, token, amount, block.timestamp);
    }

    receive() external payable {} // Allow contract to receive ETH
}