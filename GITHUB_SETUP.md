# GitHub Repository Setup Guide

## Repository URL
**https://github.com/Osiyomeoh/TrustBridgeAfrica.git**

## Initial Setup Steps

### Step 1: Check if Git is Initialized

```bash
cd /Users/MAC/Documents/TrustBridge
git status
```

If you see "not a git repository", proceed to Step 2. Otherwise, skip to Step 3.

### Step 2: Initialize Git Repository

```bash
git init
```

### Step 3: Add Remote Repository

```bash
git remote add origin https://github.com/Osiyomeoh/TrustBridgeAfrica.git
```

If the remote already exists, update it:
```bash
git remote set-url origin https://github.com/Osiyomeoh/TrustBridgeAfrica.git
```

### Step 4: Stage All Files

```bash
git add .
```

### Step 5: Create Initial Commit

```bash
git commit -m "Initial commit: TrustBridge Africa - RWA Tokenization Platform on Mantle Network

- Real-world asset tokenization platform
- Built on Mantle Network (EVM Layer 2)
- Smart contracts: CoreAssetFactory, PoolManager, AMCManager
- Frontend: React + TypeScript + Vite
- Backend: NestJS + MongoDB
- Features: Real yield system, ROI tracking, asset owner management"
```

### Step 6: Push to GitHub

```bash
git branch -M main
git push -u origin main
```

## Important Notes

✅ **Already Configured:**
- `.gitignore` file created (excludes node_modules, .env files, build artifacts)
- README.md updated with correct GitHub URL
- All sensitive files excluded

⚠️ **Before Pushing:**
- Ensure all `.env` files are not committed (check `.gitignore`)
- Review what will be committed: `git status`
- Make sure no sensitive keys are in the code

## After Pushing

1. **Update Repository Settings on GitHub:**
   - Add description: "Real-World Asset Tokenization Platform on Mantle Network"
   - Add topics: `blockchain`, `mantle-network`, `rwa`, `tokenization`, `defi`, `real-world-assets`, `solidity`, `nestjs`, `react`
   - Set repository visibility (Public/Private)

2. **Add Repository Badges** (optional):
   - Add to README.md if desired

3. **Enable GitHub Actions** (if using CI/CD):
   - For automated testing and deployment

4. **Add License** (if needed):
   - Create LICENSE file in root directory

## Repository Structure

```
TrustBridgeAfrica/
├── README.md                    # Main documentation
├── .gitignore                   # Git ignore rules
├── trustbridge-backend/         # NestJS backend
│   ├── src/                    # Source code
│   ├── contracts/              # Smart contracts
│   └── package.json
├── trustbridge-frontend/        # React frontend
│   ├── src/                    # Source code
│   └── package.json
└── GITHUB_SETUP.md            # This file
```

## Troubleshooting

**If push fails:**
- Check authentication: `git config --global user.name` and `git config --global user.email`
- Verify remote: `git remote -v`
- Try force push (if needed): `git push -u origin main --force` (⚠️ Use with caution)

**If repository is not empty:**
- Pull first: `git pull origin main --allow-unrelated-histories`
- Resolve conflicts if any
- Then push: `git push -u origin main`

