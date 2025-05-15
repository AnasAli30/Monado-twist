// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TokenReward is Ownable {
    using ECDSA for bytes32;

    // Mapping to track used signatures
    mapping(bytes => bool) public usedSignatures;
    
    // Server's public key for signature verification
    address public serverSigner;

    event TokenRewarded(address indexed user, address indexed token, uint256 amount);
    event ServerSignerUpdated(address indexed newSigner);

    constructor(address _serverSigner) {
        serverSigner = _serverSigner;
    }

    function updateServerSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid signer address");
        serverSigner = _newSigner;
        emit ServerSignerUpdated(_newSigner);
    }

    function claimTokenReward(
        address token,
        uint256 amount,
        bytes memory signature
    ) external {
        require(!usedSignatures[signature], "Signature already used");
        require(verifySignature(token, amount, signature), "Invalid signature");

        // Mark signature as used
        usedSignatures[signature] = true;

        // Transfer tokens
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");

        emit TokenRewarded(msg.sender, token, amount);
    }

    function verifySignature(
        address token,
        uint256 amount,
        bytes memory signature
    ) public view returns (bool) {
        // Create the message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                amount
            )
        );

        // Create the signed message hash
        bytes32 signedMessageHash = messageHash.toEthSignedMessageHash();

        // Recover the signer
        address recoveredSigner = signedMessageHash.recover(signature);

        // Check if the recovered signer matches our server signer
        return recoveredSigner == serverSigner;
    }

    // Function to withdraw any stuck tokens
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Transfer failed");
    }
} 