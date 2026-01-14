// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TRUST Token - TrustBridge Protocol Governance Token
 * @notice ERC20 token with governance capabilities and fee utility
 */
contract TrustToken is ERC20, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1B tokens
    uint256 public constant INITIAL_SUPPLY = 200_000_000 * 1e18; // 200M initial circulation
    
    mapping(address => uint256) public stakingBalances;
    mapping(address => uint256) public stakingTimestamps;
    mapping(address => uint256) public lockPeriods; // in seconds
    
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    
    constructor() ERC20("TrustBridge", "TRUST") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    /**
     * @notice Public minting function for testing purposes
     * @dev Allows any user to mint up to 1000 TRUST tokens for testing
     * @param amount Amount of tokens to mint (max 1000)
     */
    function mintTestTokens(uint256 amount) external {
        require(amount <= 1000 * 10**18, "Test minting limited to 1000 TRUST tokens");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(msg.sender, amount);
    }
    
    function burn(uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
    }
    
    function stake(uint256 amount, uint256 lockPeriod) external whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(lockPeriod >= 30 days && lockPeriod <= 365 days, "Invalid lock period");
        
        _transfer(msg.sender, address(this), amount);
        stakingBalances[msg.sender] += amount;
        stakingTimestamps[msg.sender] = block.timestamp;
        lockPeriods[msg.sender] = lockPeriod;
        
        emit Staked(msg.sender, amount, lockPeriod);
    }
    
    function unstake() external nonReentrant {
        uint256 stakedAmount = stakingBalances[msg.sender];
        require(stakedAmount > 0, "No staked tokens");
        require(
            block.timestamp >= stakingTimestamps[msg.sender] + lockPeriods[msg.sender],
            "Tokens still locked"
        );
        
        uint256 reward = calculateReward(msg.sender);
        
        stakingBalances[msg.sender] = 0;
        stakingTimestamps[msg.sender] = 0;
        lockPeriods[msg.sender] = 0;
        
        _transfer(address(this), msg.sender, stakedAmount);
        if (reward > 0) {
            _mint(msg.sender, reward);
        }
        
        emit Unstaked(msg.sender, stakedAmount, reward);
    }
    
    function calculateReward(address staker) public view returns (uint256) {
        uint256 stakedAmount = stakingBalances[staker];
        uint256 lockPeriod = lockPeriods[staker];
        uint256 timeStaked = block.timestamp - stakingTimestamps[staker];
        
        if (stakedAmount == 0 || timeStaked < lockPeriod) return 0;
        
        // APY calculation: 5% (30d) to 25% (365d)
        uint256 apyBasisPoints;
        if (lockPeriod <= 30 days) apyBasisPoints = 500; // 5%
        else if (lockPeriod <= 90 days) apyBasisPoints = 1000; // 10%
        else if (lockPeriod <= 180 days) apyBasisPoints = 1500; // 15%
        else apyBasisPoints = 2500; // 25%
        
        return (stakedAmount * apyBasisPoints * timeStaked) / (10000 * 365 days);
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
