// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WinnerVault
 * @dev A vault contract that receives MON tokens for winners and allows them to withdraw their winnings
 * @notice This contract stores MON winnings for users and allows them to withdraw anytime
 */
contract WinnerVault {
    // Mapping from user address to their balance
    mapping(address => uint256) public balances;
    
    // Owner of the contract
    address public owner;
    
    // Events
    event Deposited(address indexed user, uint256 amount, address indexed depositor);
    event Withdrawn(address indexed user, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Constructor sets the contract deployer as the owner
     */
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Deposits MON for a specific user
     * @param user The address of the user who won
     * @param amount The amount of MON to deposit (in wei)
     * @notice This function is called by the backend when a user wins
     * @notice The function must receive MON equal to the amount parameter
     */
    function depositFor(address user, uint256 amount) external payable {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value == amount, "Sent value must equal amount");
        
        balances[user] += amount;
        
        emit Deposited(user, amount, msg.sender);
    }
    
    /**
     * @dev Allows users to withdraw their entire balance
     * @notice Users can call this function to withdraw all their winnings
     * @notice The function selector is 0x3ccfd60b
     */
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // Reset balance before transfer to prevent reentrancy
        balances[msg.sender] = 0;
        
        // Transfer MON to user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Returns the balance of a specific user
     * @param user The address to check
     * @return The balance in wei
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Returns the total contract balance
     * @return The total MON held in the contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Transfers ownership of the contract to a new owner
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @dev Emergency function to withdraw contract balance (only owner)
     * @notice This is only for emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner).call{value: contractBalance}("");
        require(success, "Emergency withdraw failed");
    }
    
    /**
     * @dev Fallback function to receive MON
     */
    receive() external payable {
        // Accept direct MON transfers
    }
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {
        // Accept MON transfers
    }
}
