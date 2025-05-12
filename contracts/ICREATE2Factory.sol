// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICREATE2Factory {
    function deploy(bytes32 salt, bytes memory bytecode) external returns (address);
    function getDeployed(address deployer, bytes32 salt, bytes32 bytecodeHash) external view returns (address);
}