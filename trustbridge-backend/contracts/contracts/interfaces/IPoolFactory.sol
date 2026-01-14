// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPoolFactory {
    struct Pool {
        bytes32 poolId;
        address manager;
        string name;
        string strategy;
        address[] assets;
        uint256 totalValue;
        uint256 dropTokenSupply;
        uint256 tinTokenSupply;
        uint256 dropTokenPrice;
        uint256 tinTokenPrice;
        uint256 targetAPY;
        uint256 actualAPY;
        uint8 riskLevel; // 1=Low, 2=Medium, 3=High
        uint8 status; // 1=Draft, 2=Active, 3=Paused, 4=Closed, 5=Matured
        uint256 minimumInvestment;
        uint256 maximumInvestment;
        uint256 lockupPeriod;
        uint256 maturityDate;
        address dropTokenContract;
        address tinTokenContract;
        address poolContract;
        uint256 totalInvestors;
        uint256 totalInvested;
        uint256 createdAt;
    }

    struct Investor {
        address investor;
        uint256 dropTokens;
        uint256 tinTokens;
        uint256 totalInvested;
        uint256 entryDate;
        uint256 lastUpdate;
    }

    struct PerformanceMetrics {
        uint256 totalReturn;
        uint256 monthlyReturn;
        uint256 volatility;
        uint256 sharpeRatio;
        uint256 maxDrawdown;
    }

    event PoolCreated(
        bytes32 indexed poolId,
        address indexed manager,
        string name,
        uint256 totalValue,
        address dropTokenContract,
        address tinTokenContract
    );

    event PoolStatusUpdated(bytes32 indexed poolId, uint8 oldStatus, uint8 newStatus);
    event InvestorAdded(bytes32 indexed poolId, address indexed investor, uint256 amount);
    event PoolMatured(bytes32 indexed poolId, uint256 finalValue);

    function createPool(
        string memory name,
        string memory strategy,
        address[] memory assets,
        uint256 dropTokenSupply,
        uint256 tinTokenSupply,
        uint256 targetAPY,
        uint8 riskLevel,
        uint256 minimumInvestment,
        uint256 maximumInvestment,
        uint256 lockupPeriod,
        uint256 maturityDate
    ) external payable returns (bytes32);

    function getPool(bytes32 poolId) external view returns (Pool memory);
    function getPoolInvestors(bytes32 poolId) external view returns (Investor[] memory);
    function getPoolPerformance(bytes32 poolId) external view returns (PerformanceMetrics memory);
    function updatePoolStatus(bytes32 poolId, uint8 newStatus) external;
    function addInvestor(bytes32 poolId, address investor, uint256 amount) external;
    function removeInvestor(bytes32 poolId, address investor) external;
    function distributeRewards(bytes32 poolId, uint256 amount) external;
    function maturePool(bytes32 poolId) external;
}
