# 🔄 AMC Workflow Guide - Asset Status Flow

## Overview

Assets must go through the complete AMC (Asset Management Company) workflow before they can be added to investment pools. The asset must reach **ACTIVE_AMC_MANAGED (status 6)** to be poolable.

## Status Flow

```
PENDING_VERIFICATION (0) ← YOU ARE HERE
    ↓
VERIFIED_PENDING_AMC (1) - Verify Asset
    ↓
AMC_INSPECTION_SCHEDULED (2) - Schedule Inspection
    ↓
AMC_INSPECTION_COMPLETED (3) - Complete Inspection
    ↓
LEGAL_TRANSFER_PENDING (4) - Initiate Legal Transfer
    ↓
LEGAL_TRANSFER_COMPLETED (5) - Complete Legal Transfer
    ↓
ACTIVE_AMC_MANAGED (6) ✅ - Ready for Pooling
```

## Current Issue

**Error:** `Asset is not ready for pooling. On-chain status: 0. Asset must be ACTIVE_AMC_MANAGED (status 6) to be added to a pool.`

**Problem:** Your asset is currently at **status 0 (PENDING_VERIFICATION)** but needs to be at **status 6 (ACTIVE_AMC_MANAGED)** before it can be added to a pool.

## Required Steps (AMC Dashboard)

Complete these steps in order using the **AMC Dashboard** (`/dashboard/amc-dashboard`):

### Step 1: Approve Asset (Status 0 → 1)
- **Tab:** "Pending Approval"
- **Action:** Click "Approve Asset" button
- **Required Role:** AMC_ROLE
- **Result:** Status changes to `VERIFIED_PENDING_AMC (1)`

### Step 2: Schedule Inspection (Status 1 → 2)
- **Tab:** "Assigned Assets" or "Inspections"
- **Action:** Click "Schedule Inspection" button
- **Required Role:** AMC_ROLE
- **Result:** Status changes to `AMC_INSPECTION_SCHEDULED (2)`

### Step 3: Complete Inspection (Status 2 → 3)
- **Tab:** "Inspections"
- **Action:** Click "Complete Inspection" button
- **Required Role:** AMC_ROLE or INSPECTOR_ROLE
- **Result:** Status changes to `AMC_INSPECTION_COMPLETED (3)`

### Step 4: Initiate Legal Transfer (Status 3 → 4)
- **Tab:** "Legal Transfers"
- **Action:** Click "Initiate Legal Transfer" button
- **Required Role:** AMC_ROLE
- **Result:** Status changes to `LEGAL_TRANSFER_PENDING (4)`

### Step 5: Complete Legal Transfer (Status 4 → 5)
- **Tab:** "Legal Transfers"
- **Action:** Click "Complete Legal Transfer" button
- **Required Role:** AMC_ROLE
- **Result:** Status changes to `LEGAL_TRANSFER_COMPLETED (5)`

### Step 6: Activate Asset (Status 5 → 6) ✅
- **Tab:** "Legal Transfers" (or "Active Assets" after activation)
- **Action:** Click "Activate Asset" button
- **Required Role:** AMC_ROLE
- **Result:** Status changes to `ACTIVE_AMC_MANAGED (6)` - **Ready for Pooling!**

## Quick Checklist

Use the AMC Dashboard tabs in this order:

- [ ] **Pending Approval Tab:** Approve asset (status 0 → 1)
- [ ] **Inspections Tab:** Schedule and complete inspection (status 1 → 3)
- [ ] **Legal Transfers Tab:** Initiate and complete legal transfer (status 3 → 5)
- [ ] **Legal Transfers Tab:** Activate asset (status 5 → 6)
- [ ] **Pool Management Tab:** Add asset to pool (now possible!)

## Important Notes

1. **All steps must be completed in order** - you cannot skip steps
2. **Each step requires the appropriate role** - ensure your wallet has AMC_ROLE
3. **Status is stored on-chain** - changes are permanent and verifiable
4. **Only ACTIVE_AMC_MANAGED (6) assets can be pooled** - this ensures assets are fully verified and legally transferred

## Troubleshooting

### "Asset not found" error
- **Cause:** Using old AMCManager contract address
- **Fix:** Update `VITE_AMC_MANAGER_ADDRESS` in `.env` to `0x995a59e804c9c53Ca1fe7e529ccd6f0dA617e36A`

### "Asset not in valid status" error
- **Cause:** Trying to skip steps or asset is in wrong status
- **Fix:** Complete all steps in order, starting from current status

### "Caller is not an AMC admin" error
- **Cause:** Wallet doesn't have AMC_ROLE
- **Fix:** Grant AMC_ROLE to your wallet address using deployment scripts
