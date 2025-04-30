// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ExampleContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;
    
    mapping(address => bool) public executors;

    // Define custom errors for more gas-efficient and detailed error reporting
    error ZeroAmount();
    error InvalidRecipientAddress();
    error InsufficientContractBalance();
    error NotAuthorizedExecutor();
    error EthTransferFailed();


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

    function depositNative() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

    }

    function Native() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

    }

    function transferNative(
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
                        revert (reason);
                    }
                }
                // If not standard format, return raw data
                revert("No error data available");
            }
            // No error data
            revert("No error data available");
        }
    }

    receive() external payable {} // Allow contract to receive ETH
}