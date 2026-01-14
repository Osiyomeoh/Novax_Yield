// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CoreAssetFactory.sol";
import "./PoolToken.sol";

/**
 * @title PoolManager
 * @dev Investment pool management for fractionalized RWA trading with Centrifuge-style tranches
 */
contract PoolManager is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AMC_ROLE = keccak256("AMC_ROLE");

    CoreAssetFactory public immutable assetFactory;
    IERC20 public immutable trustToken;

    enum TrancheType {
        SENIOR,  // Lower risk, lower returns (DROP-like)
        JUNIOR   // Higher risk, higher returns (TIN-like)
    }

    struct Tranche {
        bytes32 trancheId;
        TrancheType trancheType;
        string name;          // "Senior" or "Junior"
        address tokenContract; // ERC20 PoolToken contract
        uint256 percentage;   // Percentage of pool (basis points, e.g., 7000 = 70%)
        uint256 expectedAPY;  // Expected APY (basis points, e.g., 800 = 8%)
        uint256 totalInvested; // Total TRUST tokens invested in this tranche
        uint256 totalShares;   // Total pool tokens minted for this tranche
        bool isActive;
    }

    struct Pool {
        bytes32 poolId;
        address creator;
        string name;
        string description;
        uint256 totalValue;
        uint256 totalShares;
        uint256 managementFee; // Basis points
        uint256 performanceFee; // Basis points
        bool isActive;
        bool hasTranches;      // Whether pool uses tranches
        uint256 createdAt;
        bytes32[] assets; // Asset IDs in this pool
        bytes32[] tranches; // Tranche IDs for this pool
        mapping(address => uint256) userShares; // User's pool token balance (if no tranches)
        mapping(address => uint256) userInvestments; // User's total investment (if no tranches)
    }

    // Tranche-specific tracking
    mapping(bytes32 => mapping(address => uint256)) public userTrancheShares; // trancheId => user => shares
    mapping(bytes32 => mapping(address => uint256)) public userTrancheInvestments; // trancheId => user => investment

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => Tranche) public tranches;
    mapping(address => bytes32[]) public userPools;
    mapping(bytes32 => bytes32) public assetToPool;

    uint256 public totalPools;
    uint256 public totalValueLocked;

    event PoolCreated(bytes32 indexed poolId, address indexed creator, string name, uint256 totalValue);
    event TrancheCreated(bytes32 indexed poolId, bytes32 indexed trancheId, TrancheType trancheType, address tokenContract);
    event AssetAddedToPool(bytes32 indexed poolId, bytes32 indexed assetId, address indexed amc);
    event PoolTokenIssued(bytes32 indexed poolId, address indexed investor, uint256 amount);
    event TrancheTokenIssued(bytes32 indexed poolId, bytes32 indexed trancheId, address indexed investor, uint256 amount);
    event PoolTokenTraded(bytes32 indexed poolId, address indexed seller, address indexed buyer, uint256 amount, uint256 price);
    event TrancheTokenTraded(bytes32 indexed poolId, bytes32 indexed trancheId, address indexed seller, address buyer, uint256 amount, uint256 price);
    event PoolTokensRedeemed(bytes32 indexed poolId, address indexed investor, uint256 tokensRedeemed, uint256 trustReturned);
    event TrancheTokensRedeemed(bytes32 indexed poolId, bytes32 indexed trancheId, address indexed investor, uint256 tokensRedeemed, uint256 trustReturned);

    constructor(address _assetFactory, address _trustToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(AMC_ROLE, msg.sender);
        
        assetFactory = CoreAssetFactory(_assetFactory);
        trustToken = IERC20(_trustToken);
    }

    /**
     * @notice Create investment pool (simple pool without tranches)
     */
    function createPool(
        string memory _name,
        string memory _description,
        uint256 _managementFee,
        uint256 _performanceFee
    ) external onlyRole(AMC_ROLE) returns (bytes32) {
        require(_managementFee <= 500, "Management fee too high"); // Max 5%
        require(_performanceFee <= 2000, "Performance fee too high"); // Max 20%

        bytes32 poolId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));
        
        pools[poolId].poolId = poolId;
        pools[poolId].creator = msg.sender;
        pools[poolId].name = _name;
        pools[poolId].description = _description;
        pools[poolId].totalValue = 0;
        pools[poolId].totalShares = 0;
        pools[poolId].managementFee = _managementFee;
        pools[poolId].performanceFee = _performanceFee;
        pools[poolId].isActive = true;
        pools[poolId].hasTranches = false;
        pools[poolId].createdAt = block.timestamp;
        pools[poolId].assets = new bytes32[](0);
        pools[poolId].tranches = new bytes32[](0);

        userPools[msg.sender].push(poolId);
        totalPools++;

        emit PoolCreated(poolId, msg.sender, _name, 0);
        return poolId;
    }

    /**
     * @notice Create pool with tranches (Centrifuge-style)
     * @param _name Pool name
     * @param _description Pool description
     * @param _managementFee Management fee in basis points
     * @param _performanceFee Performance fee in basis points
     * @param _seniorPercentage Senior tranche percentage (basis points, e.g., 7000 = 70%)
     * @param _seniorAPY Senior tranche expected APY (basis points, e.g., 800 = 8%)
     * @param _juniorAPY Junior tranche expected APY (basis points, e.g., 1500 = 15%)
     * @param _seniorSymbol Senior tranche token symbol (e.g., "WAFS" for "West Africa Senior")
     * @param _juniorSymbol Junior tranche token symbol (e.g., "WAFJ" for "West Africa Junior")
     */
    function createPoolWithTranches(
        string memory _name,
        string memory _description,
        uint256 _managementFee,
        uint256 _performanceFee,
        uint256 _seniorPercentage,
        uint256 _seniorAPY,
        uint256 _juniorAPY,
        string memory _seniorSymbol,
        string memory _juniorSymbol
    ) external onlyRole(AMC_ROLE) returns (bytes32 poolId, bytes32 seniorTrancheId, bytes32 juniorTrancheId) {
        require(_managementFee <= 500, "Management fee too high");
        require(_performanceFee <= 2000, "Performance fee too high");
        require(_seniorPercentage > 0 && _seniorPercentage < 10000, "Invalid senior percentage");
        require(_seniorAPY <= 5000, "Senior APY too high"); // Max 50%
        require(_juniorAPY <= 10000, "Junior APY too high"); // Max 100%

        poolId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));
        
        // Create pool
        pools[poolId].poolId = poolId;
        pools[poolId].creator = msg.sender;
        pools[poolId].name = _name;
        pools[poolId].description = _description;
        pools[poolId].totalValue = 0;
        pools[poolId].totalShares = 0;
        pools[poolId].managementFee = _managementFee;
        pools[poolId].performanceFee = _performanceFee;
        pools[poolId].isActive = true;
        pools[poolId].hasTranches = true;
        pools[poolId].createdAt = block.timestamp;
        pools[poolId].assets = new bytes32[](0);
        pools[poolId].tranches = new bytes32[](0);

        // Create Senior Tranche
        seniorTrancheId = keccak256(abi.encodePacked(poolId, "SENIOR", block.timestamp));
        string memory seniorName = string(abi.encodePacked(_name, " Senior"));
        PoolToken seniorToken = new PoolToken(seniorName, _seniorSymbol);
        
        tranches[seniorTrancheId] = Tranche({
            trancheId: seniorTrancheId,
            trancheType: TrancheType.SENIOR,
            name: "Senior",
            tokenContract: address(seniorToken),
            percentage: _seniorPercentage,
            expectedAPY: _seniorAPY,
            totalInvested: 0,
            totalShares: 0,
            isActive: true
        });

        // Grant MINTER_ROLE and BURNER_ROLE to PoolManager for senior token
        bytes32 minterRole = seniorToken.MINTER_ROLE();
        bytes32 burnerRole = seniorToken.BURNER_ROLE();
        seniorToken.grantRole(minterRole, address(this));
        seniorToken.grantRole(burnerRole, address(this));

        pools[poolId].tranches.push(seniorTrancheId);

        // Create Junior Tranche
        juniorTrancheId = keccak256(abi.encodePacked(poolId, "JUNIOR", block.timestamp));
        string memory juniorName = string(abi.encodePacked(_name, " Junior"));
        PoolToken juniorToken = new PoolToken(juniorName, _juniorSymbol);
        
        tranches[juniorTrancheId] = Tranche({
            trancheId: juniorTrancheId,
            trancheType: TrancheType.JUNIOR,
            name: "Junior",
            tokenContract: address(juniorToken),
            percentage: 10000 - _seniorPercentage, // Remaining percentage
            expectedAPY: _juniorAPY,
            totalInvested: 0,
            totalShares: 0,
            isActive: true
        });

        // Grant MINTER_ROLE and BURNER_ROLE to PoolManager for junior token
        minterRole = juniorToken.MINTER_ROLE();
        burnerRole = juniorToken.BURNER_ROLE();
        juniorToken.grantRole(minterRole, address(this));
        juniorToken.grantRole(burnerRole, address(this));

        pools[poolId].tranches.push(juniorTrancheId);

        userPools[msg.sender].push(poolId);
        totalPools++;

        emit PoolCreated(poolId, msg.sender, _name, 0);
        emit TrancheCreated(poolId, seniorTrancheId, TrancheType.SENIOR, address(seniorToken));
        emit TrancheCreated(poolId, juniorTrancheId, TrancheType.JUNIOR, address(juniorToken));
    }

    /**
     * @notice Add asset to pool
     */
    function addAssetToPool(bytes32 _poolId, bytes32 _assetId) external onlyRole(AMC_ROLE) {
        Pool storage pool = pools[_poolId];
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.creator == msg.sender, "Not the pool creator");
        require(pool.isActive, "Pool not active");

        CoreAssetFactory.UniversalAsset memory asset = assetFactory.getAsset(_assetId);
        require(asset.status == CoreAssetFactory.AssetStatus.ACTIVE_AMC_MANAGED, "Asset not AMC managed");
        require(assetToPool[_assetId] == bytes32(0), "Asset already in pool");

        pool.assets.push(_assetId);
        assetToPool[_assetId] = _poolId;

        emit AssetAddedToPool(_poolId, _assetId, msg.sender);
    }

    /**
     * @notice Invest in pool using TRUST tokens (for pools without tranches)
     */
    function investInPool(
        bytes32 _poolId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[_poolId];
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.isActive, "Pool not active");
        require(!pool.hasTranches, "Pool has tranches - use investInTranche");
        require(_amount > 0, "Invalid amount");

        // Transfer TRUST tokens from investor to this contract
        require(trustToken.transferFrom(msg.sender, address(this), _amount), "TRUST transfer failed");

        // Calculate pool tokens to issue
        uint256 poolTokens = (pool.totalValue == 0) ? _amount : (_amount * pool.totalShares) / pool.totalValue;
        
        // Update pool
        pool.userShares[msg.sender] += poolTokens;
        pool.userInvestments[msg.sender] += _amount;
        pool.totalValue += _amount;
        pool.totalShares += poolTokens;

        totalValueLocked += _amount;

        emit PoolTokenIssued(_poolId, msg.sender, poolTokens);
    }

    /**
     * @notice Invest in specific tranche (Centrifuge-style)
     * @param _poolId Pool ID
     * @param _trancheId Tranche ID (Senior or Junior)
     * @param _amount Amount of TRUST tokens to invest
     */
    function investInTranche(
        bytes32 _poolId,
        bytes32 _trancheId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[_poolId];
        Tranche storage tranche = tranches[_trancheId];
        
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.isActive, "Pool not active");
        require(pool.hasTranches, "Pool does not have tranches");
        require(tranche.trancheId != bytes32(0), "Tranche not found");
        require(tranche.isActive, "Tranche not active");
        require(_amount > 0, "Invalid amount");

        // Verify tranche belongs to pool
        bool isValidTranche = false;
        for (uint i = 0; i < pool.tranches.length; i++) {
            if (pool.tranches[i] == _trancheId) {
                isValidTranche = true;
                break;
            }
        }
        require(isValidTranche, "Tranche does not belong to pool");

        // Transfer TRUST tokens from investor to this contract
        require(trustToken.transferFrom(msg.sender, address(this), _amount), "TRUST transfer failed");

        // Calculate tranche tokens to mint
        uint256 trancheTokens = (tranche.totalInvested == 0) ? _amount : (_amount * tranche.totalShares) / tranche.totalInvested;
        
        // Update tranche
        tranche.totalInvested += _amount;
        tranche.totalShares += trancheTokens;
        userTrancheShares[_trancheId][msg.sender] += trancheTokens;
        userTrancheInvestments[_trancheId][msg.sender] += _amount;

        // Mint ERC20 tokens to investor
        PoolToken trancheToken = PoolToken(tranche.tokenContract);
        trancheToken.mint(msg.sender, trancheTokens);

        // Update pool totals
        pool.totalValue += _amount;
        pool.totalShares += trancheTokens;

        totalValueLocked += _amount;

        emit TrancheTokenIssued(_poolId, _trancheId, msg.sender, trancheTokens);
    }

    /**
     * @notice Trade pool tokens using TRUST tokens (for simple pools)
     */
    function tradePoolTokens(
        bytes32 _poolId,
        address _buyer,
        uint256 _amount,
        uint256 _price
    ) external nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.isActive, "Pool not active");
        require(!pool.hasTranches, "Pool has tranches - use tradeTrancheTokens");
        require(pool.userShares[msg.sender] >= _amount, "Insufficient shares");
        require(_amount > 0, "Invalid amount");
        require(_price > 0, "Invalid price");

        // Transfer shares
        pool.userShares[msg.sender] -= _amount;
        pool.userShares[_buyer] += _amount;

        // Transfer TRUST tokens as payment
        // _price is in TRUST wei per pool token wei
        uint256 totalPrice = (_amount * _price) / 1e18;
        require(trustToken.transferFrom(_buyer, msg.sender, totalPrice), "TRUST transfer failed");

        emit PoolTokenTraded(_poolId, msg.sender, _buyer, _amount, _price);
    }

    /**
     * @notice Trade tranche tokens (ERC20) - investors can trade directly via ERC20 transfers
     * This function is kept for compatibility, but tranche tokens are standard ERC20
     */
    function tradeTrancheTokens(
        bytes32 _poolId,
        bytes32 _trancheId,
        address _buyer,
        uint256 _amount,
        uint256 _price
    ) external nonReentrant {
        Pool storage pool = pools[_poolId];
        Tranche storage tranche = tranches[_trancheId];
        
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.hasTranches, "Pool does not have tranches");
        require(tranche.trancheId != bytes32(0), "Tranche not found");
        require(tranche.isActive, "Tranche not active");

        PoolToken trancheToken = PoolToken(tranche.tokenContract);
        require(trancheToken.balanceOf(msg.sender) >= _amount, "Insufficient tranche tokens");
        require(_amount > 0, "Invalid amount");
        require(_price > 0, "Invalid price");

        // Transfer tranche tokens (ERC20)
        require(trancheToken.transferFrom(msg.sender, _buyer, _amount), "Tranche token transfer failed");

        // Transfer TRUST tokens as payment
        // _price is in TRUST wei per tranche token wei (e.g., 1.1e18 means 1.1 TRUST per token)
        // So totalPrice = (_amount * _price) / 1e18 to convert from wei^2 to wei
        uint256 totalPrice = (_amount * _price) / 1e18;
        require(trustToken.transferFrom(_buyer, msg.sender, totalPrice), "TRUST transfer failed");

        emit TrancheTokenTraded(_poolId, _trancheId, msg.sender, _buyer, _amount, _price);
    }

    /**
     * @notice Get pool details
     */
    function getPool(bytes32 _poolId) external view returns (
        bytes32 poolId,
        address creator,
        string memory name,
        string memory description,
        uint256 totalValue,
        uint256 totalShares,
        uint256 managementFee,
        uint256 performanceFee,
        bool isActive,
        bool hasTranches,
        uint256 createdAt,
        bytes32[] memory assets,
        bytes32[] memory poolTranches
    ) {
        Pool storage pool = pools[_poolId];
        return (
            pool.poolId,
            pool.creator,
            pool.name,
            pool.description,
            pool.totalValue,
            pool.totalShares,
            pool.managementFee,
            pool.performanceFee,
            pool.isActive,
            pool.hasTranches,
            pool.createdAt,
            pool.assets,
            pool.tranches
        );
    }

    /**
     * @notice Get tranche details
     */
    function getTranche(bytes32 _trancheId) external view returns (
        bytes32 trancheId,
        uint8 trancheType,
        string memory name,
        address tokenContract,
        uint256 percentage,
        uint256 expectedAPY,
        uint256 totalInvested,
        uint256 totalShares,
        bool isActive
    ) {
        Tranche storage tranche = tranches[_trancheId];
        return (
            tranche.trancheId,
            uint8(tranche.trancheType),
            tranche.name,
            tranche.tokenContract,
            tranche.percentage,
            tranche.expectedAPY,
            tranche.totalInvested,
            tranche.totalShares,
            tranche.isActive
        );
    }

    /**
     * @notice Get user pools
     */
    function getUserPools(address _user) external view returns (bytes32[] memory) {
        return userPools[_user];
    }

    /**
     * @notice Get user shares in pool (for simple pools)
     */
    function getUserShares(bytes32 _poolId, address _user) external view returns (uint256) {
        return pools[_poolId].userShares[_user];
    }

    /**
     * @notice Get user investment in pool (for simple pools)
     */
    function getUserInvestment(bytes32 _poolId, address _user) external view returns (uint256) {
        return pools[_poolId].userInvestments[_user];
    }

    /**
     * @notice Get user shares in tranche
     */
    function getUserTrancheShares(bytes32 _trancheId, address _user) external view returns (uint256) {
        return userTrancheShares[_trancheId][_user];
    }

    /**
     * @notice Get user investment in tranche
     */
    function getUserTrancheInvestment(bytes32 _trancheId, address _user) external view returns (uint256) {
        return userTrancheInvestments[_trancheId][_user];
    }

    /**
     * @notice Redeem pool tokens and receive TRUST tokens back (for simple pools)
     * @param _poolId Pool ID
     * @param _amount Amount of pool tokens to redeem
     */
    function redeemPoolTokens(
        bytes32 _poolId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[_poolId];
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.isActive, "Pool not active");
        require(!pool.hasTranches, "Pool has tranches - use redeemTrancheTokens");
        require(pool.userShares[msg.sender] >= _amount, "Insufficient shares");
        require(_amount > 0, "Invalid amount");
        require(pool.totalShares > 0, "No shares in pool");
        
        // Calculate TRUST tokens to return based on current pool value
        // Formula: (tokens × totalValue) / totalShares
        uint256 trustToReturn = (_amount * pool.totalValue) / pool.totalShares;
        require(trustToReturn > 0, "Redeem amount too small");
        
        // Calculate proportional investment to deduct
        uint256 investmentToDeduct = (pool.userInvestments[msg.sender] * _amount) / pool.userShares[msg.sender];
        
        // Update pool
        pool.userShares[msg.sender] -= _amount;
        pool.userInvestments[msg.sender] -= investmentToDeduct;
        pool.totalShares -= _amount;
        pool.totalValue -= trustToReturn;
        
        // Update global totals
        totalValueLocked -= trustToReturn;
        
        // Transfer TRUST tokens back to investor
        require(trustToken.transfer(msg.sender, trustToReturn), "TRUST transfer failed");
        
        emit PoolTokensRedeemed(_poolId, msg.sender, _amount, trustToReturn);
    }

    /**
     * @notice Redeem tranche tokens and receive TRUST tokens back (for pools with tranches)
     * @param _poolId Pool ID
     * @param _trancheId Tranche ID
     * @param _amount Amount of tranche tokens to redeem
     */
    function redeemTrancheTokens(
        bytes32 _poolId,
        bytes32 _trancheId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Pool storage pool = pools[_poolId];
        Tranche storage tranche = tranches[_trancheId];
        
        require(pool.poolId != bytes32(0), "Pool not found");
        require(pool.isActive, "Pool not active");
        require(pool.hasTranches, "Pool does not have tranches");
        require(tranche.trancheId != bytes32(0), "Tranche not found");
        require(tranche.isActive, "Tranche not active");
        require(tranche.totalShares > 0, "No shares in tranche");
        
        // Verify tranche belongs to pool
        bool isValidTranche = false;
        for (uint i = 0; i < pool.tranches.length; i++) {
            if (pool.tranches[i] == _trancheId) {
                isValidTranche = true;
                break;
            }
        }
        require(isValidTranche, "Tranche does not belong to pool");
        
        // Check user has enough tokens
        PoolToken trancheToken = PoolToken(tranche.tokenContract);
        require(trancheToken.balanceOf(msg.sender) >= _amount, "Insufficient tranche tokens");
        require(_amount > 0, "Invalid amount");
        
        // Calculate TRUST tokens to return
        // Formula: (tokens × totalInvested) / totalShares
        uint256 trustToReturn = (_amount * tranche.totalInvested) / tranche.totalShares;
        require(trustToReturn > 0, "Redeem amount too small");
        
        // Calculate proportional investment to deduct
        uint256 investmentToDeduct = (userTrancheInvestments[_trancheId][msg.sender] * _amount) / userTrancheShares[_trancheId][msg.sender];
        
        // Burn tranche tokens
        trancheToken.burn(msg.sender, _amount);
        
        // Update tranche
        userTrancheShares[_trancheId][msg.sender] -= _amount;
        userTrancheInvestments[_trancheId][msg.sender] -= investmentToDeduct;
        tranche.totalShares -= _amount;
        tranche.totalInvested -= trustToReturn;
        
        // Update pool
        pool.totalShares -= _amount;
        pool.totalValue -= trustToReturn;
        
        // Update global totals
        totalValueLocked -= trustToReturn;
        
        // Transfer TRUST tokens back to investor
        require(trustToken.transfer(msg.sender, trustToReturn), "TRUST transfer failed");
        
        emit TrancheTokensRedeemed(_poolId, _trancheId, msg.sender, _amount, trustToReturn);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
