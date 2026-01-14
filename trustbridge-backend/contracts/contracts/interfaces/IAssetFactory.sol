// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAssetFactory {
    struct Asset {
        bytes32 id;
        address owner;
        string assetType;
        string name;
        string location;
        uint256 totalValue;
        uint256 tokenSupply;
        uint256 tokenizedAmount;
        uint256 maturityDate;
        uint8 verificationScore;
        bool isActive;
        uint256 createdAt;
        address tokenContract;
    }

    function tokenizeAsset(
        string memory assetType,
        string memory name,
        string memory location,
        uint256 totalValue,
        uint256 tokenSupply,
        uint256 maturityDate,
        bytes32 verificationAssetId
    ) external payable returns (bytes32);

    function getAsset(bytes32 assetId) external view returns (Asset memory);
    function getUserAssets(address user) external view returns (bytes32[] memory);
    function setVerificationRegistry(address _verificationRegistry) external;
}
