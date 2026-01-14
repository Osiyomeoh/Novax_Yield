// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetNFT.sol";

/**
 * @title CoreAssetFactory
 * @dev Core asset creation and management functionality
 */
contract CoreAssetFactory is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant AMC_ROLE = keccak256("AMC_ROLE");
    
    // AMCManager contract address (set after deployment)
    address public amcManager;

    IERC20 public immutable trustToken;
    AssetNFT public immutable assetNFT;
    address public feeRecipient;

    uint256 public constant MIN_CREATION_FEE = 100 * 10**18; // 100 TRUST tokens
    uint256 public constant DIGITAL_CREATION_FEE = 10 * 10**18; // 10 TRUST tokens
    uint256 public constant AMC_TRANSFER_FEE = 50 * 10**18; // 50 TRUST tokens

    enum AssetCategory { 
        REAL_ESTATE, 
        COMMODITY, 
        AGRICULTURE, 
        INFRASTRUCTURE, 
        BUSINESS, 
        OTHER,
        // Digital Asset Categories
        DIGITAL_ART,
        MUSIC,
        GAMING,
        VIRTUAL_REAL_ESTATE,
        SOCIAL_CONTENT,
        MEMES,
        VIRAL_CONTENT
    }
    
    enum AssetType { 
        RWA,           // Real-World Asset (Centrifuge-style)
        DIGITAL        // Digital Asset (OpenSea-style)
    }
    
    enum VerificationLevel { BASIC, PROFESSIONAL, EXPERT, MASTER }
    enum AssetStatus { 
        PENDING_VERIFICATION, 
        VERIFIED_PENDING_AMC, 
        AMC_INSPECTION_SCHEDULED,
        AMC_INSPECTION_COMPLETED,
        LEGAL_TRANSFER_PENDING,
        LEGAL_TRANSFER_COMPLETED,
        ACTIVE_AMC_MANAGED,
        DIGITAL_VERIFIED,
        DIGITAL_ACTIVE,
        REJECTED,
        FLAGGED
    }

    struct UniversalAsset {
        bytes32 id;
        address originalOwner;
        address currentOwner;
        AssetCategory category;
        AssetType assetType;
        string assetTypeString;
        string name;
        string location;
        uint256 totalValue;
        uint256 maturityDate;
        uint256 maxInvestablePercentage; // Maximum percentage of asset that can be tokenized (0-100)
        VerificationLevel verificationLevel;
        string[] evidenceHashes;
        string[] documentTypes;
        string imageURI;
        string documentURI;
        string description;
        address nftContract;
        uint256 tokenId;
        AssetStatus status;
        address currentAMC;
        uint256 createdAt;
        uint256 verifiedAt;
        uint256 amcTransferredAt;
        uint256 tradingVolume;
        uint256 lastSalePrice;
        bool isTradeable;
        bool isListed;
        uint256 listingPrice;
        uint256 listingExpiry;
        address currentBuyer;
        uint256 currentOffer;
    }

    mapping(bytes32 => UniversalAsset) public assets;
    mapping(address => bytes32[]) public userAssets;
    mapping(address => bytes32[]) public amcManagedAssets;
    mapping(bytes32 => uint8) public assetFlowStage;
    mapping(bytes32 => uint8) public assetFlowProgress;
    mapping(bytes32 => string) public assetFlowStatusText;

    uint256 public totalAssets;

    event AssetCreated(
        bytes32 indexed assetId,
        address indexed owner,
        AssetCategory category,
        string assetType,
        string name,
        uint256 totalValue,
        AssetStatus status
    );
    event AssetVerified(bytes32 indexed assetId, VerificationLevel level, AssetStatus status);
    event AssetRejected(bytes32 indexed assetId, address indexed rejectedBy, string reason);
    event AssetFlowProgressUpdated(bytes32 indexed assetId, uint8 stage, uint8 progress, string statusText);

    constructor(address _trustToken, address _assetNFT, address _feeRecipient) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(AMC_ROLE, msg.sender);

        trustToken = IERC20(_trustToken);
        assetNFT = AssetNFT(_assetNFT);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create RWA asset (Centrifuge-style flow)
     */
    function createRWAAsset(
        AssetCategory _category,
        string memory _assetTypeString,
        string memory _name,
        string memory _location,
        uint256 _totalValue,
        uint256 _maturityDate,
        uint256 _maxInvestablePercentage,
        string[] memory _evidenceHashes,
        string[] memory _documentTypes,
        string memory _imageURI,
        string memory _documentURI,
        string memory _description
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(_totalValue > 0, "Asset value must be greater than 0");
        require(_evidenceHashes.length == _documentTypes.length, "Mismatched evidence and document types");
        require(_category < AssetCategory.DIGITAL_ART, "Invalid category for RWA asset");
        require(_maxInvestablePercentage <= 100, "Max investable percentage must be between 0 and 100");
        
        // Check if user has sent TRUST tokens to this contract for fee payment
        uint256 contractBalance = trustToken.balanceOf(address(this));
        require(contractBalance >= MIN_CREATION_FEE, "Insufficient TRUST tokens sent to contract. Please send TRUST tokens to this contract first.");
        
        // Transfer fee to fee recipient using transfer (which works)
        require(trustToken.transfer(feeRecipient, MIN_CREATION_FEE), "Fee transfer failed");

        bytes32 assetId = keccak256(abi.encodePacked(msg.sender, _name, block.timestamp));

        assets[assetId] = UniversalAsset({
            id: assetId,
            originalOwner: msg.sender,
            currentOwner: msg.sender,
            category: _category,
            assetType: AssetType.RWA,
            assetTypeString: _assetTypeString,
            name: _name,
            location: _location,
            totalValue: _totalValue,
            maturityDate: _maturityDate,
            maxInvestablePercentage: _maxInvestablePercentage,
            verificationLevel: VerificationLevel.BASIC,
            evidenceHashes: _evidenceHashes,
            documentTypes: _documentTypes,
            imageURI: _imageURI,
            documentURI: _documentURI,
            description: _description,
            nftContract: address(assetNFT),
            tokenId: 0,
            status: AssetStatus.PENDING_VERIFICATION,
            currentAMC: address(0),
            createdAt: block.timestamp,
            verifiedAt: 0,
            amcTransferredAt: 0,
            tradingVolume: 0,
            lastSalePrice: 0,
            isTradeable: false,
            isListed: false,
            listingPrice: 0,
            listingExpiry: 0,
            currentBuyer: address(0),
            currentOffer: 0
        });

        userAssets[msg.sender].push(assetId);
        totalAssets++;
        
        // Initialize flow tracking
        assetFlowStage[assetId] = 0; // PENDING_VERIFICATION
        assetFlowProgress[assetId] = 20; // 20% complete
        assetFlowStatusText[assetId] = "Asset Created - Pending Verification";

        emit AssetCreated(assetId, msg.sender, _category, _assetTypeString, _name, _totalValue, AssetStatus.PENDING_VERIFICATION);
        emit AssetFlowProgressUpdated(assetId, 0, 20, "Asset Created - Pending Verification");
        
        return assetId;
    }

    /**
     * @notice Create digital asset (OpenSea-style flow)
     */
    function createDigitalAsset(
        AssetCategory _category,
        string memory _assetTypeString,
        string memory _name,
        string memory _location,
        uint256 _totalValue,
        string memory _imageURI,
        string memory _description
    ) external nonReentrant whenNotPaused returns (bytes32) {
        require(_totalValue > 0, "Asset value must be greater than 0");
        require(_category >= AssetCategory.DIGITAL_ART, "Invalid category for digital asset");
        
        // Check if user has sent TRUST tokens to this contract for fee payment
        uint256 contractBalance = trustToken.balanceOf(address(this));
        require(contractBalance >= DIGITAL_CREATION_FEE, "Insufficient TRUST tokens sent to contract. Please send TRUST tokens to this contract first.");
        
        // Transfer fee to fee recipient using transfer (which works)
        require(trustToken.transfer(feeRecipient, DIGITAL_CREATION_FEE), "Fee transfer failed");

        bytes32 assetId = keccak256(abi.encodePacked(msg.sender, _name, block.timestamp));

        assets[assetId] = UniversalAsset({
            id: assetId,
            originalOwner: msg.sender,
            currentOwner: msg.sender,
            category: _category,
            assetType: AssetType.DIGITAL,
            assetTypeString: _assetTypeString,
            name: _name,
            location: _location,
            totalValue: _totalValue,
            maturityDate: 0,
            maxInvestablePercentage: 100, // Digital assets default to 100% investable
            verificationLevel: VerificationLevel.BASIC,
            evidenceHashes: new string[](0),
            documentTypes: new string[](0),
            imageURI: _imageURI,
            documentURI: "",
            description: _description,
            nftContract: address(assetNFT),
            tokenId: 0,
            status: AssetStatus.DIGITAL_VERIFIED,
            currentAMC: address(0),
            createdAt: block.timestamp,
            verifiedAt: block.timestamp,
            amcTransferredAt: 0,
            tradingVolume: 0,
            lastSalePrice: 0,
            isTradeable: true,
            isListed: false,
            listingPrice: 0,
            listingExpiry: 0,
            currentBuyer: address(0),
            currentOffer: 0
        });

        userAssets[msg.sender].push(assetId);
        totalAssets++;
        
        // Initialize flow tracking
        assetFlowStage[assetId] = 5; // DIGITAL_ACTIVE
        assetFlowProgress[assetId] = 100; // 100% complete
        assetFlowStatusText[assetId] = "Digital Asset Created - Ready to Trade";

        // Mint NFT immediately for digital assets
        AssetNFT.AssetMetadata memory metadata = AssetNFT.AssetMetadata({
            assetType: _assetTypeString,
            name: _name,
            location: _location,
            totalValue: _totalValue,
            tokenizedValue: _totalValue,
            maturityDate: block.timestamp + (365 * 24 * 60 * 60), // 1 year from now for digital assets
            verificationScore: 100,
            isActive: true,
            createdAt: block.timestamp,
            imageURI: _imageURI,
            documentURI: "",
            description: _description
        });
        
        uint256 newTokenId = assetNFT.mintAsset(msg.sender, metadata);
        assets[assetId].tokenId = newTokenId;
        assets[assetId].status = AssetStatus.DIGITAL_ACTIVE;

        emit AssetCreated(assetId, msg.sender, _category, _assetTypeString, _name, _totalValue, AssetStatus.DIGITAL_ACTIVE);
        emit AssetFlowProgressUpdated(assetId, 5, 100, "Digital Asset Created - Ready to Trade");
        
        return assetId;
    }

    /**
     * @notice Verify asset
     * @dev AMC admins handle verification directly (no separate verifier needed)
     * @dev AMC can skip this and go directly to physical inspection
     */
    function verifyAsset(bytes32 _assetId, VerificationLevel _level) external {
        // AMC_ROLE handles verification directly (VERIFIER_ROLE kept for backward compatibility)
        require(
            hasRole(AMC_ROLE, msg.sender) || hasRole(VERIFIER_ROLE, msg.sender),
            "Caller is not an AMC admin or verifier"
        );
        
        UniversalAsset storage asset = assets[_assetId];
        require(asset.id != bytes32(0), "Asset not found");
        require(asset.status == AssetStatus.PENDING_VERIFICATION || asset.status == AssetStatus.FLAGGED, "Asset not in PENDING_VERIFICATION or FLAGGED status");
        require(_level >= asset.verificationLevel, "New verification level must be equal or higher");

        asset.verificationLevel = _level;
        asset.status = AssetStatus.VERIFIED_PENDING_AMC;
        asset.verifiedAt = block.timestamp;

        // Update flow tracking
        assetFlowStage[_assetId] = 1; // VERIFIED_PENDING_AMC
        assetFlowProgress[_assetId] = 40; // 40% complete
        assetFlowStatusText[_assetId] = "Asset Verified - Select AMC";

        emit AssetVerified(_assetId, _level, AssetStatus.VERIFIED_PENDING_AMC);
        emit AssetFlowProgressUpdated(_assetId, 1, 40, "Asset Verified - Select AMC");
    }

    /**
     * @notice Reject asset
     * @dev AMC admins and verifiers can reject assets that don't meet requirements
     */
    function rejectAsset(bytes32 _assetId) external {
        // Allow both VERIFIER_ROLE and AMC_ROLE to reject assets
        require(
            hasRole(VERIFIER_ROLE, msg.sender) || hasRole(AMC_ROLE, msg.sender),
            "Caller is not a verifier or AMC admin"
        );
        
        UniversalAsset storage asset = assets[_assetId];
        require(asset.id != bytes32(0), "Asset not found");
        require(
            asset.status == AssetStatus.PENDING_VERIFICATION || 
            asset.status == AssetStatus.FLAGGED,
            "Asset not in valid status for rejection"
        );

        asset.status = AssetStatus.REJECTED;

        // Update flow tracking
        assetFlowStage[_assetId] = 0; // Reset to initial stage
        assetFlowProgress[_assetId] = 0; // 0% complete (rejected)
        assetFlowStatusText[_assetId] = "Asset Rejected";

        emit AssetRejected(_assetId, msg.sender, "Asset rejected by AMC admin or verifier");
        emit AssetFlowProgressUpdated(_assetId, 0, 0, "Asset Rejected");
    }

    /**
     * @notice Update asset status (called by AMCManager after legal transfer)
     * @dev Only AMCManager can call this to activate assets
     */
    function updateAssetStatus(bytes32 _assetId, AssetStatus _newStatus) external {
        require(msg.sender == amcManager, "Only AMCManager can update asset status");
        UniversalAsset storage asset = assets[_assetId];
        require(asset.id != bytes32(0), "Asset not found");
        
        asset.status = _newStatus;
        
        // Update flow tracking based on status
        if (_newStatus == AssetStatus.ACTIVE_AMC_MANAGED) {
            assetFlowStage[_assetId] = 6; // ACTIVE_AMC_MANAGED
            assetFlowProgress[_assetId] = 100; // 100% complete
            assetFlowStatusText[_assetId] = "Asset Active - Ready for Marketplace";
        } else if (_newStatus == AssetStatus.AMC_INSPECTION_COMPLETED) {
            assetFlowStage[_assetId] = 3; // AMC_INSPECTION_COMPLETED
            assetFlowProgress[_assetId] = 60; // 60% complete
            assetFlowStatusText[_assetId] = "Physical Inspection Completed";
        } else if (_newStatus == AssetStatus.LEGAL_TRANSFER_COMPLETED) {
            assetFlowStage[_assetId] = 5; // LEGAL_TRANSFER_COMPLETED
            assetFlowProgress[_assetId] = 80; // 80% complete
            assetFlowStatusText[_assetId] = "Legal Transfer Completed";
        }
        
        emit AssetFlowProgressUpdated(_assetId, assetFlowStage[_assetId], assetFlowProgress[_assetId], assetFlowStatusText[_assetId]);
    }

    /**
     * @notice Set AMCManager contract address
     */
    function setAMCManager(address _amcManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_amcManager != address(0), "Invalid AMCManager address");
        amcManager = _amcManager;
    }

    /**
     * @notice Get asset details
     */
    function getAsset(bytes32 _assetId) external view returns (UniversalAsset memory) {
        return assets[_assetId];
    }

    /**
     * @notice Get user assets
     */
    function getUserAssets(address _user) external view returns (bytes32[] memory) {
        return userAssets[_user];
    }

    /**
     * @notice Get AMC managed assets
     */
    function getAMCManagedAssets(address _amc) external view returns (bytes32[] memory) {
        return amcManagedAssets[_amc];
    }

    /**
     * @notice Check if asset is ready for trading
     */
    function isAssetReadyForTrading(bytes32 _assetId) external view returns (bool) {
        UniversalAsset memory asset = assets[_assetId];
        return (asset.status == AssetStatus.ACTIVE_AMC_MANAGED || 
                asset.status == AssetStatus.DIGITAL_ACTIVE) && 
               asset.isTradeable;
    }

    /**
     * @notice Get asset flow status
     */
    function getAssetFlowStatus(bytes32 _assetId) external view returns (uint8 stage, uint8 progress, string memory statusText) {
        return (assetFlowStage[_assetId], assetFlowProgress[_assetId], assetFlowStatusText[_assetId]);
    }

    /**
     * @dev Send TRUST tokens to this contract for fee payment
     * Users should call this function before creating assets
     */
    function sendTrustTokensForFee() external {
        // This function allows users to send TRUST tokens to the contract
        // The tokens will be used for fee payment when creating assets
        // Users need to call trustToken.transfer(address(this), amount) first
        // This is just a placeholder function for documentation
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
