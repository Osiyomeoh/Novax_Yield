// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CoreAssetFactory.sol";

/**
 * @title AMCManager
 * @dev Asset Management Company functionality
 */
contract AMCManager is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant AMC_ROLE = keccak256("AMC_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");

    CoreAssetFactory public immutable assetFactory;

    enum InspectionStatus { PENDING, SCHEDULED, COMPLETED, FLAGGED, REJECTED }
    enum TransferStatus { PENDING, INITIATED, COMPLETED, REJECTED }

    struct AMCProfile {
        address amcAddress;
        string name;
        string description;
        string jurisdiction;
        bool isActive;
        uint256 registrationDate;
        uint256 totalAssetsManaged;
        uint256 inspectionCount;
        uint256 successfulTransfers;
    }

    struct InspectionRecord {
        bytes32 assetId;
        address inspector;
        InspectionStatus status;
        string comments;
        string inspectionReportHash;
        uint256 scheduledAt;
        uint256 completedAt;
    }

    struct LegalTransferRecord {
        bytes32 assetId;
        address individualOwner;
        address amcAddress;
        TransferStatus status;
        string legalDocumentHash;
        uint256 initiatedAt;
        uint256 completedAt;
    }

    mapping(address => AMCProfile) public amcProfiles;
    mapping(bytes32 => InspectionRecord) public inspectionRecords;
    mapping(bytes32 => LegalTransferRecord) public legalTransferRecords;
    mapping(bytes32 => address) public assetToAMC;

    event AMCRegistered(address indexed amcAddress, string name, string jurisdiction);
    event InspectionScheduled(bytes32 indexed assetId, address indexed inspector, uint256 scheduledAt);
    event InspectionCompleted(bytes32 indexed assetId, address indexed inspector, InspectionStatus status, string comments, string reportHash);
    event LegalTransferInitiated(bytes32 indexed assetId, address indexed individualOwner, address indexed amcAddress, string legalDocumentHash);
    event LegalTransferCompleted(bytes32 indexed assetId, address indexed individualOwner, address indexed amcAddress);
    event AssetRejectedByAMC(bytes32 indexed assetId, string reason);
    event AssetFlaggedByAMC(bytes32 indexed assetId, string reason);
    event AssetActivated(bytes32 indexed assetId, address indexed amcAddress);

    constructor(address _assetFactory) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AMC_ROLE, msg.sender);
        _grantRole(INSPECTOR_ROLE, msg.sender);
        assetFactory = CoreAssetFactory(_assetFactory);
    }

    /**
     * @notice Register AMC
     */
    function registerAMC(
        string memory _name,
        string memory _description,
        string memory _jurisdiction
    ) external onlyRole(AMC_ROLE) {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_jurisdiction).length > 0, "Jurisdiction required");
        require(!amcProfiles[msg.sender].isActive, "AMC already registered");

        amcProfiles[msg.sender] = AMCProfile({
            amcAddress: msg.sender,
            name: _name,
            description: _description,
            jurisdiction: _jurisdiction,
            isActive: true,
            registrationDate: block.timestamp,
            totalAssetsManaged: 0,
            inspectionCount: 0,
            successfulTransfers: 0
        });

        emit AMCRegistered(msg.sender, _name, _jurisdiction);
    }

    /**
     * @notice Schedule physical inspection
     * @dev AMC handles physical verification directly (no separate inspector needed)
     */
    function scheduleInspection(
        bytes32 _assetId,
        address _inspector,
        uint256 _scheduledAt
    ) external onlyRole(AMC_ROLE) {
        CoreAssetFactory.UniversalAsset memory asset = assetFactory.getAsset(_assetId);
        // Allow scheduling from PENDING_VERIFICATION (AMC handles verification directly)
        require(
            asset.status == CoreAssetFactory.AssetStatus.PENDING_VERIFICATION || 
            asset.status == CoreAssetFactory.AssetStatus.VERIFIED_PENDING_AMC,
            "Asset not in valid status for inspection"
        );
        require(_inspector != address(0), "Invalid inspector address");
        // Allow AMC_ROLE or INSPECTOR_ROLE (AMC can be the inspector)
        require(
            hasRole(AMC_ROLE, _inspector) || hasRole(INSPECTOR_ROLE, _inspector),
            "Inspector must be AMC admin or have INSPECTOR_ROLE"
        );
        require(_scheduledAt > block.timestamp || _scheduledAt == 0, "Scheduled time must be in the future or 0 for immediate");

        inspectionRecords[_assetId] = InspectionRecord({
            assetId: _assetId,
            inspector: _inspector,
            status: InspectionStatus.SCHEDULED,
            comments: "",
            inspectionReportHash: "",
            scheduledAt: _scheduledAt,
            completedAt: 0
        });

        // Update asset status in CoreAssetFactory to AMC_INSPECTION_SCHEDULED
        assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.AMC_INSPECTION_SCHEDULED);

        emit InspectionScheduled(_assetId, _inspector, _scheduledAt);
    }

    /**
     * @notice Complete physical inspection
     * @dev AMC admins handle physical verification directly (no separate inspector needed)
     */
    function completeInspection(
        bytes32 _assetId,
        InspectionStatus _status,
        string memory _comments,
        string memory _inspectionReportHash
    ) external {
        // Allow both AMC_ROLE and INSPECTOR_ROLE (AMC handles it directly)
        require(
            hasRole(AMC_ROLE, msg.sender) || hasRole(INSPECTOR_ROLE, msg.sender),
            "Caller is not an AMC admin or inspector"
        );
        
        InspectionRecord storage inspection = inspectionRecords[_assetId];
        // If inspection not scheduled yet, allow AMC to complete it directly
        if (inspection.assetId == bytes32(0)) {
            // AMC can complete inspection without scheduling if they have AMC_ROLE
            require(hasRole(AMC_ROLE, msg.sender), "Inspection not scheduled and caller is not AMC admin");
            inspection.assetId = _assetId;
            inspection.inspector = msg.sender;
            inspection.status = InspectionStatus.SCHEDULED;
            inspection.scheduledAt = block.timestamp;
        } else {
            // If inspection was scheduled, only assigned inspector or AMC admin can complete
            require(
                inspection.inspector == msg.sender || hasRole(AMC_ROLE, msg.sender),
                "Only assigned inspector or AMC admin can complete"
            );
        }
        require(inspection.status == InspectionStatus.SCHEDULED, "Inspection not in SCHEDULED status");
        require(_status == InspectionStatus.COMPLETED || _status == InspectionStatus.FLAGGED || _status == InspectionStatus.REJECTED, "Invalid completion status");

        inspection.status = _status;
        inspection.comments = _comments;
        inspection.inspectionReportHash = _inspectionReportHash;
        inspection.completedAt = block.timestamp;

        // Update asset status in CoreAssetFactory if inspection completed
        if (_status == InspectionStatus.COMPLETED) {
            assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.AMC_INSPECTION_COMPLETED);
        } else if (_status == InspectionStatus.REJECTED) {
            assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.REJECTED);
        } else if (_status == InspectionStatus.FLAGGED) {
            assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.FLAGGED);
        }

        // Update AMC stats
        amcProfiles[msg.sender].inspectionCount++;

        if (_status == InspectionStatus.REJECTED) {
            emit AssetRejectedByAMC(_assetId, _comments);
        } else if (_status == InspectionStatus.FLAGGED) {
            emit AssetFlaggedByAMC(_assetId, _comments);
        }

        emit InspectionCompleted(_assetId, msg.sender, _status, _comments, _inspectionReportHash);
    }

    /**
     * @notice Initiate legal transfer
     * @dev AMC handles legal transfer after physical verification
     */
    function initiateLegalTransfer(
        bytes32 _assetId,
        address _individualOwner,
        string memory _legalDocumentHash
    ) external onlyRole(AMC_ROLE) {
        CoreAssetFactory.UniversalAsset memory asset = assetFactory.getAsset(_assetId);
        // Allow initiating legal transfer after inspection is completed
        require(
            asset.status == CoreAssetFactory.AssetStatus.PENDING_VERIFICATION ||
            asset.status == CoreAssetFactory.AssetStatus.VERIFIED_PENDING_AMC ||
            asset.status == CoreAssetFactory.AssetStatus.AMC_INSPECTION_COMPLETED,
            "Asset not in valid status for legal transfer"
        );
        require(inspectionRecords[_assetId].status == InspectionStatus.COMPLETED, "Physical inspection not completed");
        require(_individualOwner == asset.originalOwner, "Individual owner mismatch");
        require(legalTransferRecords[_assetId].assetId == bytes32(0), "Legal transfer already initiated");

        legalTransferRecords[_assetId] = LegalTransferRecord({
            assetId: _assetId,
            individualOwner: _individualOwner,
            amcAddress: msg.sender,
            status: TransferStatus.INITIATED,
            legalDocumentHash: _legalDocumentHash,
            initiatedAt: block.timestamp,
            completedAt: 0
        });

        emit LegalTransferInitiated(_assetId, _individualOwner, msg.sender, _legalDocumentHash);
    }

    /**
     * @notice Complete legal transfer
     */
    function completeLegalTransfer(bytes32 _assetId) external onlyRole(AMC_ROLE) {
        LegalTransferRecord storage transfer = legalTransferRecords[_assetId];
        require(transfer.assetId == _assetId, "Legal transfer not initiated");
        require(transfer.status == TransferStatus.INITIATED, "Legal transfer not in INITIATED status");

        transfer.status = TransferStatus.COMPLETED;
        transfer.completedAt = block.timestamp;
        assetToAMC[_assetId] = msg.sender;

        // Update asset status in CoreAssetFactory
        assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.LEGAL_TRANSFER_COMPLETED);

        // Update AMC stats
        amcProfiles[msg.sender].totalAssetsManaged++;
        amcProfiles[msg.sender].successfulTransfers++;

        emit LegalTransferCompleted(_assetId, transfer.individualOwner, msg.sender);
    }

    /**
     * @notice Activate asset after legal transfer
     * @dev AMC approves and activates asset for marketplace trading
     */
    function activateAsset(bytes32 _assetId) external onlyRole(AMC_ROLE) {
        CoreAssetFactory.UniversalAsset memory asset = assetFactory.getAsset(_assetId);
        require(
            asset.status == CoreAssetFactory.AssetStatus.LEGAL_TRANSFER_COMPLETED,
            "Legal transfer must be completed before activation"
        );
        require(legalTransferRecords[_assetId].status == TransferStatus.COMPLETED, "Legal transfer not completed");
        
        // Update asset status to ACTIVE_AMC_MANAGED via CoreAssetFactory
        assetFactory.updateAssetStatus(_assetId, CoreAssetFactory.AssetStatus.ACTIVE_AMC_MANAGED);
        
        emit AssetActivated(_assetId, msg.sender);
    }

    /**
     * @notice Get inspection record
     */
    function getInspectionRecord(bytes32 _assetId) external view returns (InspectionRecord memory) {
        return inspectionRecords[_assetId];
    }

    /**
     * @notice Get legal transfer record
     */
    function getLegalTransferRecord(bytes32 _assetId) external view returns (LegalTransferRecord memory) {
        return legalTransferRecords[_assetId];
    }

    /**
     * @notice Get AMC for asset
     */
    function getAMCForAsset(bytes32 _assetId) external view returns (address) {
        return assetToAMC[_assetId];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
