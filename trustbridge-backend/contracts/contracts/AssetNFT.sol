// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Asset NFT - Centrifuge-style asset tokenization
 * @notice Each NFT represents a unique real-world asset
 */
contract AssetNFT is ERC721, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");
    
    struct AssetMetadata {
        string assetType;        // "Real Estate", "Art", "Commodity"
        string name;            // "123 Main St, Lagos"
        string location;        // "Lagos, Nigeria"
        uint256 totalValue;     // $500,000
        uint256 tokenizedValue; // $500,000 (same as total for NFTs)
        uint256 maturityDate;   // When asset matures
        uint8 verificationScore; // 0-100
        bool isActive;          // Asset status
        uint256 createdAt;      // Timestamp
        string imageURI;        // Property image
        string documentURI;     // Legal documents
        string description;     // Detailed description
    }
    
    mapping(uint256 => AssetMetadata) public assetMetadata;
    mapping(address => uint256[]) public userAssets;
    mapping(string => uint256[]) public assetsByType;
    mapping(string => uint256[]) public assetsByLocation;
    
    uint256 public totalAssets;
    uint256 public totalValueLocked;
    
    event AssetMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string assetType,
        string name,
        uint256 totalValue,
        string imageURI
    );
    
    event AssetMetadataUpdated(uint256 indexed tokenId, string imageURI, string documentURI);
    event AssetStatusUpdated(uint256 indexed tokenId, bool isActive);
    
    constructor() ERC721("TrustBridge Asset", "TBA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(METADATA_ROLE, msg.sender);
    }
    
    function mintAsset(
        address to,
        AssetMetadata memory metadata
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(bytes(metadata.name).length > 0, "Name required");
        require(bytes(metadata.location).length > 0, "Location required");
        require(metadata.totalValue > 0, "Value must be > 0");
        require(metadata.maturityDate > block.timestamp, "Invalid maturity date");
        
        totalAssets++;
        uint256 tokenId = totalAssets;
        
        _mint(to, tokenId);
        
        assetMetadata[tokenId] = AssetMetadata({
            assetType: metadata.assetType,
            name: metadata.name,
            location: metadata.location,
            totalValue: metadata.totalValue,
            tokenizedValue: metadata.totalValue, // NFTs are indivisible
            maturityDate: metadata.maturityDate,
            verificationScore: metadata.verificationScore,
            isActive: metadata.isActive,
            createdAt: block.timestamp,
            imageURI: metadata.imageURI,
            documentURI: metadata.documentURI,
            description: metadata.description
        });
        
        userAssets[to].push(tokenId);
        assetsByType[metadata.assetType].push(tokenId);
        assetsByLocation[metadata.location].push(tokenId);
        totalValueLocked += metadata.totalValue;
        
        emit AssetMinted(tokenId, to, metadata.assetType, metadata.name, metadata.totalValue, metadata.imageURI);
        
        return tokenId;
    }
    
    function updateAssetMetadata(
        uint256 tokenId,
        string memory imageURI,
        string memory documentURI,
        string memory description
    ) external onlyRole(METADATA_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        assetMetadata[tokenId].imageURI = imageURI;
        assetMetadata[tokenId].documentURI = documentURI;
        assetMetadata[tokenId].description = description;
        
        emit AssetMetadataUpdated(tokenId, imageURI, documentURI);
    }
    
    function updateAssetStatus(uint256 tokenId, bool isActive) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        assetMetadata[tokenId].isActive = isActive;
        
        emit AssetStatusUpdated(tokenId, isActive);
    }
    
    function burnAsset(uint256 tokenId) external onlyRole(BURNER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        AssetMetadata memory metadata = assetMetadata[tokenId];
        totalValueLocked -= metadata.totalValue;
        
        delete assetMetadata[tokenId];
        _burn(tokenId);
    }
    
    function getAssetMetadata(uint256 tokenId) external view returns (AssetMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return assetMetadata[tokenId];
    }
    
    function getUserAssets(address user) external view returns (uint256[] memory) {
        return userAssets[user];
    }
    
    function getAssetsByType(string memory assetType) external view returns (uint256[] memory) {
        return assetsByType[assetType];
    }
    
    function getAssetsByLocation(string memory location) external view returns (uint256[] memory) {
        return assetsByLocation[location];
    }
    
    function getTotalAssets() external view returns (uint256) {
        return totalAssets;
    }
    
    function getTotalValueLocked() external view returns (uint256) {
        return totalValueLocked;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        AssetMetadata memory metadata = assetMetadata[tokenId];
        
        // Return the imageURI as the tokenURI for now
        // In production, this would return a JSON metadata URI
        return metadata.imageURI;
    }
    
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    // Required overrides for AccessControl
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}