// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Private Token Distributor
/// @notice A contract that allows confidential distribution of tokens to recipients
/// @dev Uses FHE to keep distribution amounts private
contract PrivateTokenDistributor is SepoliaConfig {
    IERC20 public token;
    address public owner;
    
    mapping(address => euint32) private _encryptedBalances;
    
    euint32 private _totalDistributed;
    
    event Deposit(address indexed from, uint256 amount);
    event RecipientAdded(address indexed recipient);
    
    /// @notice Constructor sets the token address and owner
    /// @param _tokenAddress The address of the ERC20 token to distribute
    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        owner = msg.sender;
        _totalDistributed = FHE.asEuint32(0);
    }
    
    /// @notice Modifier to restrict access to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /// @notice Deposits tokens into the contract
    /// @param amount The amount of tokens to deposit
    function depositTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from sender to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit Deposit(msg.sender, amount);
    }
    
    /// @notice Distributes tokens to a recipient with an encrypted amount
    /// @param recipient The address of the recipient
    /// @param encryptedAmount The encrypted amount to distribute
    /// @param amountProof Proof for the encrypted amount
    function distributeTokens(
        address recipient, 
        externalEuint32 encryptedAmount, 
        bytes calldata amountProof
    ) external onlyOwner {
        // Convert external encrypted value to internal
        euint32 prevBalance = _encryptedBalances[recipient];
        // If not initialized, set to zero
        if (!FHE.isInitialized(prevBalance)) {
            prevBalance = FHE.asEuint32(0);
        }
        euint32 eamount = FHE.fromExternal(encryptedAmount, amountProof);
        // Update recipient's balance
        _encryptedBalances[recipient] = FHE.add(prevBalance, eamount);
        // Update total distributed
        _totalDistributed = FHE.add(_totalDistributed, eamount);
        // Allow contract and recipient to operate on the handle
        FHE.allow(_encryptedBalances[recipient], address(this));
        FHE.allow(_encryptedBalances[recipient], recipient);
        emit RecipientAdded(recipient);
    }
    
    /// @notice Batch distribute tokens to multiple recipients with encrypted amounts
    /// @param recipients Array of recipient addresses
    /// @param encryptedAmounts Array of encrypted amounts
    /// @param amountProofs Array of proofs for the encrypted amounts
    function batchDistributeTokens(
        address[] calldata recipients,
        externalEuint32[] calldata encryptedAmounts,
        bytes[] calldata amountProofs
    ) external onlyOwner {
        require(
            recipients.length == encryptedAmounts.length && 
            recipients.length == amountProofs.length,
            "Array lengths must match"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            // Convert external encrypted value to internal
            euint32 prevBalance = _encryptedBalances[recipients[i]];
            if (!FHE.isInitialized(prevBalance)) {
                prevBalance = FHE.asEuint32(0);
            }
            euint32 eamount = FHE.fromExternal(encryptedAmounts[i], amountProofs[i]);
            // Update recipient's balance
            _encryptedBalances[recipients[i]] = FHE.add(prevBalance, eamount);
            // Update total distributed
            _totalDistributed = FHE.add(_totalDistributed, eamount);
            // Allow contract and recipient to operate on the handle
            FHE.allow(_encryptedBalances[recipients[i]], address(this));
            FHE.allow(_encryptedBalances[recipients[i]], recipients[i]);
            emit RecipientAdded(recipients[i]);
        }
    }
    
    /// @notice Get the encrypted balance of a recipient
    /// @return The encrypted balance
    function getMyBalance() external view returns (euint32) {
        return _encryptedBalances[msg.sender];
    }
    
    // Mapping to track withdrawal requests
    mapping(address => uint32) private _withdrawalRequests;
    mapping(address => uint256) private _withdrawalRequestTime;
    
    // Withdrawal delay (e.g., 1 hour)
    uint256 public constant WITHDRAWAL_DELAY = 1 hours;
    
    event WithdrawalInitiated(address indexed recipient, uint32 amount);
    event WithdrawalCompleted(address indexed recipient, uint32 amount);
    event WithdrawalCanceled(address indexed recipient);
    
    /// @notice Request withdrawal with the decrypted balance amount
    /// @param plainAmount The decrypted amount to withdraw
    function requestWithdrawal(uint32 plainAmount) external {
        require(plainAmount > 0, "Amount must be greater than 0");
        require(_withdrawalRequests[msg.sender] == 0, "Withdrawal already pending");
        
        // Store the withdrawal request
        _withdrawalRequests[msg.sender] = plainAmount;
        _withdrawalRequestTime[msg.sender] = block.timestamp;
        
        emit WithdrawalInitiated(msg.sender, plainAmount);
    }
    
    /// @notice Complete the withdrawal after delay period
    function completeWithdrawal() external {
        uint32 requestedAmount = _withdrawalRequests[msg.sender];
        require(requestedAmount > 0, "No withdrawal request pending");
        require(
            block.timestamp >= _withdrawalRequestTime[msg.sender] + WITHDRAWAL_DELAY,
            "Withdrawal delay not yet passed"
        );
        
        // Get the encrypted balance
        euint32 encryptedBalance = _encryptedBalances[msg.sender];
        // Allow contract to operate on the handle
        FHE.allow(encryptedBalance, address(this));
        // Check if the requested amount matches the encrypted balance
        ebool isEqual = FHE.eq(encryptedBalance, FHE.asEuint32(requestedAmount));
        FHE.allow(isEqual, address(this));
        // Reset balance conditionally - only if amounts match
        _encryptedBalances[msg.sender] = FHE.select(
            isEqual,
            FHE.asEuint32(0),
            encryptedBalance
        );
        // Clear the withdrawal request
        delete _withdrawalRequests[msg.sender];
        delete _withdrawalRequestTime[msg.sender];
        // Transfer tokens - this will fail if user provided wrong amount
        // because their balance won't have been reset to 0
        require(token.transfer(msg.sender, requestedAmount), "Transfer failed");
        emit WithdrawalCompleted(msg.sender, requestedAmount);
    }
    
    /// @notice Cancel a pending withdrawal request
    function cancelWithdrawal() external {
        require(_withdrawalRequests[msg.sender] > 0, "No withdrawal request pending");
        
        delete _withdrawalRequests[msg.sender];
        delete _withdrawalRequestTime[msg.sender];
        
        emit WithdrawalCanceled(msg.sender);
    }
    
    /// @notice Get pending withdrawal request info
    /// @return amount The requested withdrawal amount
    /// @return requestTime When the request was made
    function getWithdrawalRequest(address user) external view returns (uint32 amount, uint256 requestTime) {
        return (_withdrawalRequests[user], _withdrawalRequestTime[user]);
    }
    
    /// @notice Get the total distributed amount (encrypted)
    /// @return The total distributed amount
    function getTotalDistributed() external view onlyOwner returns (euint32) {
        return _totalDistributed;
    }
    
    /// @notice Change the token address
    /// @param newToken The new token address
    function setToken(address newToken) external onlyOwner {
        token = IERC20(newToken);
    }
    
    /// @notice Transfer ownership of the contract
    /// @param newOwner The new owner address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    /// @notice Emergency withdraw all tokens in case of issues
    /// @param amount The amount to withdraw
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner, amount), "Transfer failed");
    }
}