import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenomicsService } from './tokenomics.service';
import { GovernanceService, CreateProposalDto, VoteDto } from './governance.service';
import { StakingService, StakingType } from './staking.service';
import { RevenueService } from './revenue.service';

@ApiTags('Tokenomics')
@Controller('tokenomics')
export class TokenomicsController {
  constructor(
    private readonly tokenomicsService: TokenomicsService,
    private readonly governanceService: GovernanceService,
    private readonly stakingService: StakingService,
    private readonly revenueService: RevenueService,
  ) {}

  // Tokenomics Overview
  @Get('overview')
  @ApiOperation({ summary: 'Get tokenomics overview' })
  @ApiResponse({ status: 200, description: 'Tokenomics overview retrieved successfully' })
  async getTokenomicsOverview() {
    const config = this.tokenomicsService.getTokenomicsConfig();
    const distribution = this.tokenomicsService.calculateTokenDistribution();
    const metrics = await this.tokenomicsService.getTokenomicsMetrics();
    
    return {
      config,
      distribution,
      metrics,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get tokenomics metrics' })
  @ApiResponse({ status: 200, description: 'Tokenomics metrics retrieved successfully' })
  async getTokenomicsMetrics() {
    return this.tokenomicsService.getTokenomicsMetrics();
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get token distribution analytics' })
  @ApiResponse({ status: 200, description: 'Token distribution analytics retrieved successfully' })
  async getTokenDistributionAnalytics() {
    return this.tokenomicsService.getTokenDistributionAnalytics();
  }

  @Post('buyback-burn')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute buyback and burn mechanism' })
  @ApiResponse({ status: 200, description: 'Buyback and burn executed successfully' })
  async executeBuybackAndBurn() {
    return this.tokenomicsService.executeBuybackAndBurn();
  }

  // Governance
  @Get('governance/proposals')
  @ApiOperation({ summary: 'Get governance proposals' })
  @ApiResponse({ status: 200, description: 'Proposals retrieved successfully' })
  async getProposals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('proposer') proposer?: string,
  ) {
    return this.governanceService.getProposals(page, limit, status as any, proposer);
  }

  @Get('governance/proposals/:id')
  @ApiOperation({ summary: 'Get proposal details' })
  @ApiResponse({ status: 200, description: 'Proposal details retrieved successfully' })
  async getProposal(@Param('id') id: string) {
    return this.governanceService.getProposal(id);
  }

  @Post('governance/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created successfully' })
  async createProposal(@Body() createProposalDto: CreateProposalDto) {
    return this.governanceService.createProposal(createProposalDto);
  }

  @Post('governance/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  @ApiResponse({ status: 200, description: 'Vote cast successfully' })
  async castVote(@Body() voteDto: VoteDto) {
    return this.governanceService.castVote(voteDto);
  }

  @Post('governance/proposals/:id/execute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a passed proposal' })
  @ApiResponse({ status: 200, description: 'Proposal executed successfully' })
  async executeProposal(
    @Param('id') id: string,
    @Body('executor') executor: string,
  ) {
    return this.governanceService.executeProposal(id, executor);
  }

  @Get('governance/stats')
  @ApiOperation({ summary: 'Get governance statistics' })
  @ApiResponse({ status: 200, description: 'Governance statistics retrieved successfully' })
  async getGovernanceStats() {
    return this.governanceService.getGovernanceStats();
  }

  @Get('governance/voting-power/:address')
  @ApiOperation({ summary: 'Get user voting power' })
  @ApiResponse({ status: 200, description: 'Voting power retrieved successfully' })
  async getUserVotingPower(@Param('address') address: string) {
    return this.governanceService.getUserVotingPower(address);
  }

  // Staking
  @Get('staking/stats')
  @ApiOperation({ summary: 'Get staking statistics' })
  @ApiResponse({ status: 200, description: 'Staking statistics retrieved successfully' })
  async getStakingStats() {
    return this.stakingService.getStakingStats();
  }

  @Get('staking/leaderboard')
  @ApiOperation({ summary: 'Get staking leaderboard' })
  @ApiResponse({ status: 200, description: 'Staking leaderboard retrieved successfully' })
  async getStakingLeaderboard(@Query('limit') limit: number = 50) {
    return this.stakingService.getStakingLeaderboard(limit);
  }

  @Get('staking/positions/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user staking positions' })
  @ApiResponse({ status: 200, description: 'Staking positions retrieved successfully' })
  async getUserStakingPositions(@Param('userId') userId: string) {
    return this.stakingService.getUserStakingPositions(userId);
  }

  @Post('staking/stake')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stake tokens' })
  @ApiResponse({ status: 201, description: 'Tokens staked successfully' })
  async stakeTokens(
    @Body('userId') userId: string,
    @Body('stakingType') stakingType: StakingType,
    @Body('amount') amount: number,
    @Body('lockPeriod') lockPeriod: number,
  ) {
    return this.stakingService.stakeTokens(userId, stakingType, amount, lockPeriod);
  }

  @Post('staking/unstake')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unstake tokens' })
  @ApiResponse({ status: 200, description: 'Tokens unstaked successfully' })
  async unstakeTokens(
    @Body('userId') userId: string,
    @Body('stakingType') stakingType: StakingType,
  ) {
    return this.stakingService.unstakeTokens(userId, stakingType);
  }

  @Get('staking/rewards/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate staking rewards' })
  @ApiResponse({ status: 200, description: 'Staking rewards calculated successfully' })
  async calculateStakingRewards(
    @Param('userId') userId: string,
    @Query('stakingType') stakingType: StakingType,
  ) {
    return this.stakingService.calculateStakingRewards(userId, stakingType);
  }

  @Get('staking/config')
  @ApiOperation({ summary: 'Get staking configuration' })
  @ApiResponse({ status: 200, description: 'Staking configuration retrieved successfully' })
  async getStakingConfig() {
    return this.stakingService.getStakingConfig();
  }

  // Revenue
  @Get('revenue/metrics')
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully' })
  async getRevenueMetrics() {
    return this.revenueService.getRevenueMetrics();
  }

  @Get('revenue/streams')
  @ApiOperation({ summary: 'Get revenue streams' })
  @ApiResponse({ status: 200, description: 'Revenue streams retrieved successfully' })
  async getRevenueStreams(@Query('timeframe') timeframe: string = 'monthly') {
    return this.revenueService.getRevenueStreams(timeframe as any);
  }

  @Get('revenue/analytics')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(@Query('days') days: number = 30) {
    return this.revenueService.getRevenueAnalytics(days);
  }

  @Get('revenue/treasury')
  @ApiOperation({ summary: 'Get treasury balance' })
  @ApiResponse({ status: 200, description: 'Treasury balance retrieved successfully' })
  async getTreasuryBalance() {
    return this.revenueService.getTreasuryBalance();
  }

  @Post('revenue/distribute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute fees' })
  @ApiResponse({ status: 200, description: 'Fees distributed successfully' })
  async distributeFees(@Body('totalFees') totalFees: number) {
    return this.revenueService.distributeFees(totalFees);
  }

  @Get('revenue/fee-config')
  @ApiOperation({ summary: 'Get fee configuration' })
  @ApiResponse({ status: 200, description: 'Fee configuration retrieved successfully' })
  async getFeeConfiguration() {
    return this.revenueService.getFeeConfiguration();
  }

  @Put('revenue/fee-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update fee configuration' })
  @ApiResponse({ status: 200, description: 'Fee configuration updated successfully' })
  async updateFeeConfiguration(@Body() updates: any) {
    return this.revenueService.updateFeeConfiguration(updates);
  }

  // Tokenomics Parameters
  @Put('parameters')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tokenomics parameters' })
  @ApiResponse({ status: 200, description: 'Tokenomics parameters updated successfully' })
  async updateTokenomicsParameters(@Body() updates: any) {
    return this.tokenomicsService.updateTokenomicsParameters(updates);
  }

  // Utility endpoints
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get tokenomics leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(@Query('limit') limit: number = 50) {
    return this.tokenomicsService.getStakingLeaderboard(limit);
  }

  @Get('revenue/:timeframe')
  @ApiOperation({ summary: 'Calculate revenue for specific timeframe' })
  @ApiResponse({ status: 200, description: 'Revenue calculated successfully' })
  async calculateRevenue(@Param('timeframe') timeframe: string) {
    return this.revenueService.calculateRevenue(timeframe as any);
  }
}
