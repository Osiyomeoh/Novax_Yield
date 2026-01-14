import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AMCService, RegisterAMCDto, ScheduleInspectionDto, CompleteInspectionDto, InitiateLegalTransferDto, SendInspectionNotificationDto } from './amc.service';

@Controller('amc')
export class AMCController {
  constructor(private readonly amcService: AMCService) {}

  @Post('register')
  async registerAMC(@Body() registerDto: RegisterAMCDto) {
    return this.amcService.registerAMC(registerDto);
  }

  @Post('inspection/schedule')
  async scheduleInspection(@Body() scheduleDto: ScheduleInspectionDto) {
    return this.amcService.scheduleInspection(scheduleDto);
  }

  @Post('inspection/complete')
  async completeInspection(@Body() completeDto: CompleteInspectionDto) {
    return this.amcService.completeInspection(completeDto);
  }

  @Post('transfer/initiate')
  async initiateLegalTransfer(@Body() transferDto: InitiateLegalTransferDto) {
    return this.amcService.initiateLegalTransfer(transferDto);
  }

  @Post('transfer/complete/:assetId')
  async completeLegalTransfer(@Param('assetId') assetId: string, @Body() body: { manager: string }) {
    return this.amcService.completeLegalTransfer(assetId, body.manager);
  }

  @Get('inspection/:assetId')
  async getInspectionRecord(@Param('assetId') assetId: string) {
    return this.amcService.getInspectionRecord(assetId);
  }

  @Get('transfer/:assetId')
  async getLegalTransferRecord(@Param('assetId') assetId: string) {
    return this.amcService.getLegalTransferRecord(assetId);
  }

  @Get('stats')
  async getAMCStats() {
    return this.amcService.getAMCStats();
  }

  @Post('inspection/send-notification')
  async sendInspectionNotification(@Body() notificationDto: SendInspectionNotificationDto) {
    return this.amcService.sendInspectionNotification(notificationDto);
  }
}
