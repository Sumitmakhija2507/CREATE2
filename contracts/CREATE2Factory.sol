// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ICREATE2Factory} from "./ICREATE2Factory.sol";

contract CREATE2Factory is ICREATE2Factory  {
    event Deployed(address indexed deployer, address deployed, bytes32 salt);

    /// @notice Deploys a contract using CREATE2
    /// @param salt A salt used for deterministic address generation
    /// @param bytecode The creation code of the contract to deploy
    function deploy(bytes32 salt, bytes memory bytecode) external returns (address deployed) {
        require(bytecode.length != 0, "Empty bytecode");

        bytes32 bytecodeHash = keccak256(bytecode);

        // Compute address to check if already deployed
        address expected = getDeployed(msg.sender, salt, bytecodeHash);
        require(!_isContract(expected), "Already deployed");

        // Deploy with CREATE2
        assembly {
            deployed := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(deployed != address(0), "CREATE2: Failed to deploy");
        emit Deployed(msg.sender, deployed, salt);
    }

    /// @notice Computes the address a contract will be deployed to
    function getDeployed(address deployer, bytes32 salt, bytes32 bytecodeHash) public pure returns (address) {
        return address(uint160(uint(
            keccak256(abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                bytecodeHash
            ))
        )));
    }

    /// @dev Helper to determine if code exists at an address
    function _isContract(address addr) private view returns (bool) {
        return addr.code.length > 0;
    }
}