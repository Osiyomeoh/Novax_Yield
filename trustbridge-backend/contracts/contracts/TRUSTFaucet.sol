// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./TrustToken.sol";

/**
 * @title TRUST Faucet - Public Test Token Distribution
 * @notice Allows users to get test TRUST tokens for testing the platform
 */
contract TRUSTFaucet is Ownable, ReentrancyGuard, Pausable {
    TrustToken public immutable trustToken;
    
    // Faucet configuration
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 TRUST tokens per request
    uint256 public constant COOLDOWN_PERIOD = 24 hours; // 24 hours between requests
    uint256 public constant MAX_DAILY_AMOUNT = 5000 * 10**18; // Max 5000 TRUST per day per user
    
    // User tracking
    mapping(address => uint256) public lastRequestTime;
    mapping(address => uint256) public dailyAmountClaimed;
    mapping(uint256 => uint256) public dailyTotalClaimed; // day => total amount claimed
    
    // Events
    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetRefilled(address indexed refiller, uint256 amount);
    event FaucetDrained(address indexed drainer, uint256 amount);
    
    constructor(address _trustToken) Ownable(msg.sender) {
        trustToken = TrustToken(_trustToken);
    }
    
    /**
     * @notice Claim test TRUST tokens from the faucet
     * @dev Users can claim once every 24 hours, up to 5000 TRUST per day
     */
    function claimTokens() external nonReentrant whenNotPaused {
        address user = msg.sender;
        uint256 currentTime = block.timestamp;
        uint256 currentDay = currentTime / 1 days;
        
        // Check cooldown period
        require(
            currentTime >= lastRequestTime[user] + COOLDOWN_PERIOD,
            "Faucet: Cooldown period not met"
        );
        
        // Check daily limit
        require(
            dailyAmountClaimed[user] + FAUCET_AMOUNT <= MAX_DAILY_AMOUNT,
            "Faucet: Daily limit exceeded"
        );
        
        // Check if faucet has enough tokens
        uint256 faucetBalance = trustToken.balanceOf(address(this));
        require(faucetBalance >= FAUCET_AMOUNT, "Faucet: Insufficient tokens");
        
        // Update user tracking
        lastRequestTime[user] = currentTime;
        dailyAmountClaimed[user] += FAUCET_AMOUNT;
        dailyTotalClaimed[currentDay] += FAUCET_AMOUNT;
        
        // Transfer tokens to user
        require(trustToken.transfer(user, FAUCET_AMOUNT), "Faucet: Transfer failed");
        
        emit TokensClaimed(user, FAUCET_AMOUNT, currentTime);
    }
    
    /**
     * @notice Check if user can claim tokens
     * @param user User address to check
     * @return canClaim True if user can claim tokens
     * @return timeUntilNextClaim Seconds until next claim is available
     * @return availableAmount Amount of tokens user can claim
     */
    function canUserClaim(address user) external view returns (
        bool canClaim,
        uint256 timeUntilNextClaim,
        uint256 availableAmount
    ) {
        uint256 currentTime = block.timestamp;
        uint256 currentDay = currentTime / 1 days;
        
        // Check cooldown
        bool cooldownMet = currentTime >= lastRequestTime[user] + COOLDOWN_PERIOD;
        
        // Check daily limit
        bool dailyLimitOk = dailyAmountClaimed[user] + FAUCET_AMOUNT <= MAX_DAILY_AMOUNT;
        
        // Check faucet balance
        bool hasBalance = trustToken.balanceOf(address(this)) >= FAUCET_AMOUNT;
        
        canClaim = cooldownMet && dailyLimitOk && hasBalance;
        
        if (!cooldownMet) {
            timeUntilNextClaim = (lastRequestTime[user] + COOLDOWN_PERIOD) - currentTime;
        } else {
            timeUntilNextClaim = 0;
        }
        
        if (dailyLimitOk) {
            availableAmount = FAUCET_AMOUNT;
        } else {
            availableAmount = 0;
        }
    }
    
    /**
     * @notice Get user's claim status
     * @param user User address
     * @return lastClaimTime Timestamp of last claim
     * @return dailyClaimed Amount claimed today
     * @return timeUntilNextClaim Seconds until next claim
     */
    function getUserStatus(address user) external view returns (
        uint256 lastClaimTime,
        uint256 dailyClaimed,
        uint256 timeUntilNextClaim
    ) {
        lastClaimTime = lastRequestTime[user];
        dailyClaimed = dailyAmountClaimed[user];
        
        uint256 currentTime = block.timestamp;
        if (currentTime >= lastRequestTime[user] + COOLDOWN_PERIOD) {
            timeUntilNextClaim = 0;
        } else {
            timeUntilNextClaim = (lastRequestTime[user] + COOLDOWN_PERIOD) - currentTime;
        }
    }
    
    /**
     * @notice Refill the faucet with TRUST tokens
     * @param amount Amount of tokens to add to the faucet
     */
    function refillFaucet(uint256 amount) external onlyOwner {
        require(trustToken.transferFrom(msg.sender, address(this), amount), "Faucet: Refill failed");
        emit FaucetRefilled(msg.sender, amount);
    }
    
    /**
     * @notice Drain the faucet (emergency function)
     * @param amount Amount of tokens to drain
     */
    function drainFaucet(uint256 amount) external onlyOwner {
        require(trustToken.transfer(msg.sender, amount), "Faucet: Drain failed");
        emit FaucetDrained(msg.sender, amount);
    }
    
    /**
     * @notice Pause the faucet
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the faucet
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get faucet status
     * @return balance Current faucet balance
     * @return dailyTotal Total claimed today
     * @return isPaused Whether faucet is paused
     */
    function getFaucetStatus() external view returns (
        uint256 balance,
        uint256 dailyTotal,
        bool isPaused
    ) {
        balance = trustToken.balanceOf(address(this));
        uint256 currentDay = block.timestamp / 1 days;
        dailyTotal = dailyTotalClaimed[currentDay];
        isPaused = paused();
    }
}
