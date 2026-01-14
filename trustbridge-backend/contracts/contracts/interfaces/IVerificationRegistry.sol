// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerificationRegistry {
    enum VerificationStatus { PENDING, VERIFIED, REJECTED, EXPIRED, REVOKED }

    struct VerificationRecord {
        bytes32 assetId;
        bytes32 assetType;
        address owner;
        uint256 score;
        bytes32 evidenceRoot;
        VerificationStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        address[] attestors;
    }

    function getVerificationStatus(bytes32 assetId) 
        external 
        view 
        returns (
            bool verified,
            uint256 score,
            uint256 expiresAt,
            VerificationStatus status
        );

    function hasAttestorSigned(bytes32 assetId, address attestor) 
        external 
        view 
        returns (bool);

    function submitVerification(
        bytes32 assetId,
        bytes32 assetType,
        address owner,
        uint256 score,
        bytes32 evidenceRoot,
        uint256 expiresAt,
        bytes[] calldata attestorSigs,
        address[] calldata signingAttestors
    ) external;

    function reviewVerification(bytes32 assetId, bool approved) external;
    function revokeVerification(bytes32 assetId, string memory reason) external;
}
