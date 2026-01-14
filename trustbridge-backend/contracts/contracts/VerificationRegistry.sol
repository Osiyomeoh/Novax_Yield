// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVerificationRegistry.sol";

/**
 * @title Verification Registry
 * @notice Manages on-chain verification records for assets
 */
contract VerificationRegistry is IVerificationRegistry, AccessControl, ReentrancyGuard {
    bytes32 public constant GATEWAY_ROLE = keccak256("GATEWAY_ROLE");



    mapping(bytes32 => VerificationRecord) public verifications;
    mapping(bytes32 => mapping(address => bool)) public attestorSigned;
    
    // Events
    event VerificationSubmitted(bytes32 indexed assetId, bytes32 assetType, uint256 score, bytes32 evidenceRoot);
    event VerificationApproved(bytes32 indexed assetId, uint256 score);
    event VerificationRevoked(bytes32 indexed assetId, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GATEWAY_ROLE, msg.sender);
    }

    function submitVerification(
        bytes32 assetId,
        bytes32 assetType,
        address owner,
        uint256 score,
        bytes32 evidenceRoot,
        uint256 expiresAt,
        bytes[] calldata attestorSigs,
        address[] calldata signingAttestors
    ) external onlyRole(GATEWAY_ROLE) nonReentrant {
        require(verifications[assetId].assetId == 0, "Verification already exists");
        require(attestorSigs.length == signingAttestors.length, "Signature count mismatch");
        
        // Basic validation - can be enhanced later
        require(attestorSigs.length >= 1, "At least one attestor signature required");

        // Verify attestor signatures (simplified for now)
        for (uint i = 0; i < signingAttestors.length; i++) {
            require(signingAttestors[i] != address(0), "Invalid attestor address");
            
            // In production, would verify the actual signature here
            // bytes32 messageHash = keccak256(abi.encodePacked(assetId, score, evidenceRoot));
            // require(verifySignature(messageHash, attestorSigs[i], signingAttestors[i]), "Invalid signature");
        }

        // Create verification record
        VerificationRecord storage record = verifications[assetId];
        record.assetId = assetId;
        record.assetType = assetType;
        record.owner = owner;
        record.score = score;
        record.evidenceRoot = evidenceRoot;
        record.createdAt = block.timestamp;
        record.expiresAt = expiresAt;
        record.attestors = signingAttestors;

        // Add to verification IDs array for enumeration
        if (!verificationExists[assetId]) {
            verificationIds.push(assetId);
            verificationExists[assetId] = true;
        }

        // Mark attestor signatures
        for (uint i = 0; i < signingAttestors.length; i++) {
            attestorSigned[assetId][signingAttestors[i]] = true;
            // Attestor count tracking removed for now
        }

        // Determine status (simplified)
        if (score >= 7000) { // 70% threshold
            record.status = VerificationStatus.VERIFIED;
            emit VerificationApproved(assetId, score);
        } else {
            record.status = VerificationStatus.REJECTED;
        }

        emit VerificationSubmitted(assetId, assetType, score, evidenceRoot);
    }

    function reviewVerification(
        bytes32 assetId,
        bool approved
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VerificationRecord storage record = verifications[assetId];
        require(record.assetId != 0, "Verification not found");
        require(record.status == VerificationStatus.PENDING, "Not pending review");

        if (approved) {
            record.status = VerificationStatus.VERIFIED;
            emit VerificationApproved(assetId, record.score);
        } else {
            record.status = VerificationStatus.REJECTED;
        }
    }

    function revokeVerification(
        bytes32 assetId,
        string memory reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VerificationRecord storage record = verifications[assetId];
        require(record.assetId != 0, "Verification not found");
        require(record.status == VerificationStatus.VERIFIED, "Not verified");

        record.status = VerificationStatus.REVOKED;

        // Slash attestors who signed this verification
        for (uint i = 0; i < record.attestors.length; i++) {
            // Attestor slashing removed for now
        }

        emit VerificationRevoked(assetId, reason);
    }

    function getVerificationStatus(bytes32 assetId) 
        external 
        view 
        returns (
            bool verified,
            uint256 score,
            uint256 expiresAt,
            VerificationStatus status
        ) 
    {
        VerificationRecord storage record = verifications[assetId];
        
        if (record.assetId == 0) {
            return (false, 0, 0, VerificationStatus.PENDING);
        }

        // Check if verification has expired
        if (block.timestamp > record.expiresAt && record.status == VerificationStatus.VERIFIED) {
            return (false, record.score, record.expiresAt, VerificationStatus.EXPIRED);
        }

        return (
            record.status == VerificationStatus.VERIFIED,
            record.score,
            record.expiresAt,
            record.status
        );
    }

    function hasAttestorSigned(bytes32 assetId, address attestor) 
        external 
        view 
        returns (bool) 
    {
        return attestorSigned[assetId][attestor];
    }

    // Array to store all verification IDs for enumeration
    bytes32[] public verificationIds;
    mapping(bytes32 => bool) public verificationExists;

    function getAllVerifications() 
        external 
        view 
        returns (VerificationRecord[] memory) 
    {
        VerificationRecord[] memory allVerifications = new VerificationRecord[](verificationIds.length);
        
        for (uint i = 0; i < verificationIds.length; i++) {
            allVerifications[i] = verifications[verificationIds[i]];
        }
        
        return allVerifications;
    }

    function getVerificationCount() 
        external 
        view 
        returns (uint256) 
    {
        return verificationIds.length;
    }
}
