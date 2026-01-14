import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';
import { AuthService, WalletSignature } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

export class WalletAuthDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  timestamp: number;
}

export class EmailAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  timestamp: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsOptional()
  isGoogleVerified?: boolean; // If true, skip email verification (Google already verified the email)
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ConfirmResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class PersonaWebhookDto {
  @IsString()
  @IsNotEmpty()
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      inquiry_id: string;
      reference_id?: string;
      created_at: string;
      updated_at: string;
    };
  };
}

export class DiditWebhookDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  vendor_data?: string;

  @IsOptional()
  verification_data?: any;

  @IsString()
  @IsOptional()
  workflow_id?: string;

  @IsString()
  @IsOptional()
  created_at?: string;

  @IsString()
  @IsOptional()
  updated_at?: string;
}

export class UpdateKYCStatusDto {
  @IsString()
  @IsNotEmpty()
  inquiryId: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  
  constructor(private readonly authService: AuthService) {}

  @Get('check-wallet/:address')
  @ApiOperation({ summary: 'Check if user exists with wallet address' })
  @ApiResponse({ status: 200, description: 'User check completed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async checkWalletUser(@Param('address') address: string) {
    return this.authService.checkWalletUser(address);
  }

  @Get('check-email/:email')
  @ApiOperation({ summary: 'Check if email is already registered' })
  @ApiResponse({ status: 200, description: 'Email check completed' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async checkEmailUser(@Param('email') email: string) {
    return this.authService.checkEmailUser(email);
  }

  @Get()
  @ApiOperation({ summary: 'Get authentication status' })
  @ApiResponse({ status: 200, description: 'Authentication status retrieved successfully' })
  async getAuthStatus() {
    return {
      success: true,
      data: {
        status: 'Authentication service is running',
        availableEndpoints: [
          'POST /api/auth/wallet - Connect wallet (step 1)',
          'POST /api/auth/complete-profile - Complete profile (step 2)',
          'POST /api/auth/verify-email - Verify email (step 3)',
          'POST /api/auth/email - Authenticate with email',
          'GET /api/auth/me - Get current user profile',
          'GET /api/auth/check-wallet/:address - Check if user exists with wallet address',
          'POST /api/auth/refresh - Refresh token',
          'POST /api/auth/logout - Logout user'
        ]
      },
      message: 'Authentication service is operational'
    };
  }

  @Post('wallet')
  @ApiOperation({ summary: 'Authenticate with wallet signature' })
  @ApiBody({ type: WalletAuthDto })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async authenticateWithWallet(@Body() walletAuthDto: WalletAuthDto) {
    const result = await this.authService.authenticateWithWallet(walletAuthDto);
    
    return {
      success: true,
      data: result,
      message: 'Authentication successful',
    };
  }

  @Post('email')
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({ type: EmailAuthDto })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async authenticateWithEmail(@Body() emailAuthDto: EmailAuthDto) {
    const result = await this.authService.authenticateWithEmail(
      emailAuthDto.email,
      emailAuthDto.password
    );
    
    return {
      success: true,
      data: result,
      message: 'Authentication successful',
    };
  }

  @Post('complete-profile')
  @ApiOperation({ summary: 'Complete user profile after wallet connection' })
  @ApiBody({ type: CompleteProfileDto })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 400, description: 'Profile completion failed' })
  async completeProfile(@Body() completeProfileDto: CompleteProfileDto) {
    const walletSignature = {
      address: completeProfileDto.walletAddress,
      signature: completeProfileDto.signature,
      message: completeProfileDto.message,
      timestamp: completeProfileDto.timestamp,
    };

    const result = await this.authService.completeProfile(
      walletSignature,
      completeProfileDto.email,
      completeProfileDto.name,
      {
        phone: completeProfileDto.phone,
        country: completeProfileDto.country,
        isGoogleVerified: completeProfileDto.isGoogleVerified || false,
      }
    );
    
    return {
      success: true,
      data: result,
      message: 'Profile completed successfully. Please check your email for verification.',
    };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with 6-digit code' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Email verification failed' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(verifyEmailDto.token);
    
    return {
      success: true,
      data: result,
      message: 'Email verified successfully',
    };
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email with new 6-digit code' })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 400, description: 'Resend verification failed' })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    const result = await this.authService.resendVerificationEmail(resendVerificationDto.email);
    
    return {
      success: true,
      data: result,
      message: 'Verification email sent successfully',
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: { refreshToken: string }) {
    const result = await this.authService.refreshToken(body.refreshToken);
    
    return {
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.sub);
    
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Password change failed' })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    await this.authService.changePassword(
      req.user.sub,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword
    );
    
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto.email);
    
    return {
      success: true,
      message: 'Password reset email sent',
    };
  }

  @Post('confirm-reset')
  @ApiOperation({ summary: 'Confirm password reset' })
  @ApiBody({ type: ConfirmResetDto })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Password reset failed' })
  async confirmReset(@Body() confirmResetDto: ConfirmResetDto) {
    await this.authService.confirmPasswordReset(
      confirmResetDto.token,
      confirmResetDto.newPassword
    );
    
    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req: any) {
    const user = await this.authService.getUserFromToken(req.headers.authorization?.replace('Bearer ', ''));
    
    return {
      success: true,
      data: user,
      message: 'User profile retrieved successfully',
    };
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid' })
  async verifyToken(@Body() body: { token: string }) {
    const payload = await this.authService.verifyToken(body.token);
    
    return {
      success: true,
      data: payload,
      message: 'Token is valid',
    };
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getPermissions(@Request() req: any) {
    const user = await this.authService.getUserFromToken(req.headers.authorization?.replace('Bearer ', ''));
    
    const permissions = {
      role: user.role,
      canCreateAssets: await this.authService.hasPermission((user as any)._id.toString(), 'create:assets'),
      canVerifyAssets: await this.authService.hasPermission((user as any)._id.toString(), 'verify:assets'),
      canManageUsers: await this.authService.hasPermission((user as any)._id.toString(), 'manage:users'),
      canReadAllAssets: await this.authService.hasPermission((user as any)._id.toString(), 'read:all_assets'),
    };
    
    return {
      success: true,
      data: permissions,
      message: 'Permissions retrieved successfully',
    };
  }

  // Persona KYC Webhook
  @Post('persona/webhook')
  @ApiOperation({ summary: 'Persona KYC webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async personaWebhook(@Body() webhookData: any) {
    try {
      await this.authService.processPersonaWebhook(webhookData);
      
      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
      };
    }
  }

  // Didit KYC Webhook
  @Post('didit/webhook')
  @ApiOperation({ summary: 'Didit KYC webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async diditWebhook(@Body() webhookData: any, @Request() req: any) {
    try {
      this.logger.log('Received DidIt webhook:', {
        session_id: webhookData.session_id,
        status: webhookData.status,
        webhook_type: webhookData.webhook_type,
        vendor_data: webhookData.vendor_data
      });

      // Verify webhook signature for security
      const isValidSignature = await this.authService.verifyDiditWebhookSignature(req);
      if (!isValidSignature) {
        this.logger.warn('Invalid DidIt webhook signature');
        return {
          success: false,
          message: 'Invalid webhook signature',
        };
      }

      // Process the webhook data
      const result = await this.authService.processDiditWebhook(webhookData);
      
      this.logger.log('DidIt webhook processed successfully:', result);
      
      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result
      };
    } catch (error) {
      this.logger.error('Error processing DidIt webhook:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
      };
    }
  }

  // Update KYC Status (for testing)
  @Post('kyc/update-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status updated successfully' })
  async updateKYCStatus(@Body() updateData: UpdateKYCStatusDto, @Request() req: any) {
    try {
      await this.authService.updateKYCStatus(req.user.sub, updateData.inquiryId, updateData.status);
      
      return {
        success: true,
        message: 'KYC status updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update KYC status',
        error: error.message,
      };
    }
  }

  // Debug endpoint to check user's kycInquiryId
  @Get('debug/kyc-inquiry/:userId')
  @ApiOperation({ summary: 'Debug user KYC inquiry ID' })
  @ApiResponse({ status: 200, description: 'User KYC inquiry ID retrieved' })
  async debugKycInquiry(@Param('userId') userId: string) {
    try {
      const user = await this.authService.getUserById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          userId: user._id,
          email: user.email,
          kycStatus: user.kycStatus,
          kycInquiryId: user.kycInquiryId,
          walletAddress: user.walletAddress
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get user KYC inquiry ID',
        error: error.message,
      };
    }
  }

  // Update KYC Inquiry ID
  @Post('update-kyc-inquiry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update KYC inquiry ID' })
  @ApiResponse({ status: 200, description: 'KYC inquiry ID updated' })
  async updateKycInquiry(@Body() updateData: { userId: string; kycInquiryId: string }, @Request() req: any) {
    try {
      console.log('🔧 Update KYC inquiry ID request:', updateData);
      
      const user = await this.authService.getUserById(updateData.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      console.log('🔧 Found user for inquiry update:', user.email, 'Current inquiry ID:', user.kycInquiryId);
      
      // Update KYC inquiry ID
      user.kycInquiryId = updateData.kycInquiryId;
      await user.save();

      console.log('✅ KYC inquiry ID updated successfully:', user.email, 'New inquiry ID:', user.kycInquiryId);
      
      return {
        success: true,
        message: 'KYC inquiry ID updated successfully',
        data: {
          userId: user._id,
          email: user.email,
          kycInquiryId: user.kycInquiryId
        }
      };
    } catch (error) {
      console.error('❌ KYC inquiry ID update failed:', error);
      return {
        success: false,
        message: 'Failed to update KYC inquiry ID',
        error: error.message,
      };
    }
  }

  // Direct KYC Update (bypass callback system)
  @Post('update-kyc-direct')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Directly update KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status updated directly' })
  async updateKYCDirect(@Body() updateData: { userId: string; kycStatus: string }, @Request() req: any) {
    try {
      console.log('🔧 Direct KYC update request:', updateData);
      
      const user = await this.authService.getUserById(updateData.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      console.log('🔧 Found user for direct update:', user.email, 'Current status:', user.kycStatus);
      
        // Update KYC status directly
        user.kycStatus = updateData.kycStatus;
        await user.save();

      console.log('✅ Direct KYC update successful:', user.email, 'New status:', user.kycStatus);
      
      return {
        success: true,
        message: 'KYC status updated directly',
        data: {
          userId: user._id,
          email: user.email,
          kycStatus: user.kycStatus
        }
      };
    } catch (error) {
      console.error('❌ Direct KYC update failed:', error);
      return {
        success: false,
        message: 'Failed to update KYC status directly',
        error: error.message,
      };
    }
  }

  // Get KYC Status
  @Get('kyc/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status retrieved successfully' })
  async getKYCStatus(@Request() req: any) {
    const user = await this.authService.getUserById(req.user.sub);
    
    return {
      success: true,
      data: {
        kycStatus: user.kycStatus,
        kycInquiryId: user.kycInquiryId,
      },
      message: 'KYC status retrieved successfully',
    };
  }

  // Didit Callback Endpoint
  @Get('didit/callback')
  @ApiOperation({ summary: 'Didit KYC callback' })
  @ApiResponse({ status: 200, description: 'Callback processed successfully' })
  async diditCallback(@Query() query: any) {
    try {
      console.log('🔔 DidIt callback received with query:', query);
      const { verificationSessionId, status } = query;
      
      if (!verificationSessionId) {
        console.log('❌ Missing verification session ID in callback');
        return {
          success: false,
          message: 'Missing verification session ID',
        };
      }

      console.log(`🔔 Processing DidIt callback - Session: ${verificationSessionId}, Status: ${status}`);
      
      // Process the callback
      const result = await this.authService.processDiditCallback(verificationSessionId, status);
      
      console.log('✅ DidIt callback processed successfully:', result);
      
      return {
        success: true,
        data: result,
        message: 'Callback processed successfully',
      };
    } catch (error) {
      console.error('❌ DidIt callback processing failed:', error);
      return {
        success: false,
        message: 'Failed to process callback',
        error: error.message,
      };
    }
  }

  // Didit API Proxy Endpoints
  @Post('didit/session')
  @ApiOperation({ summary: 'Create Didit verification session' })
  @ApiResponse({ status: 200, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Session creation failed' })
  async createDiditSession(@Body() body: { vendorData?: string; workflowId?: string }) {
    try {
      const result = await this.authService.createDiditSession(body.vendorData, body.workflowId);
      
      return {
        success: true,
        data: result,
        message: 'Didit session created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create Didit session',
        error: error.message,
      };
    }
  }

  @Get('didit/session/:sessionId')
  @ApiOperation({ summary: 'Get Didit session status' })
  @ApiResponse({ status: 200, description: 'Session status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to get session status' })
  async getDiditSessionStatus(@Param('sessionId') sessionId: string) {
    try {
      const result = await this.authService.getDiditSessionStatus(sessionId);
      
      return {
        success: true,
        data: result,
        message: 'Session status retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get session status',
        error: error.message,
      };
    }
  }

  // Onfido Attestor Verification Endpoints
  @Post('onfido/session')
  @ApiOperation({ summary: 'Create Onfido verification session for attestors' })
  @ApiResponse({ status: 200, description: 'Onfido session created successfully' })
  @ApiResponse({ status: 400, description: 'Failed to create Onfido session' })
  async createOnfidoSession(@Body() body: { vendorData?: string; verificationType?: string }) {
    try {
      const result = await this.authService.createOnfidoSession(body.vendorData, body.verificationType);
      return {
        success: true,
        data: result,
        message: 'Onfido session created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create Onfido session'
      };
    }
  }

  @Get('onfido/session/:sessionId')
  @ApiOperation({ summary: 'Get Onfido session status' })
  @ApiResponse({ status: 200, description: 'Session status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to get session status' })
  async getOnfidoSessionStatus(@Param('sessionId') sessionId: string) {
    try {
      const result = await this.authService.getOnfidoSessionStatus(sessionId);
      return {
        success: true,
        data: result,
        message: 'Session status retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get session status'
      };
    }
  }

  // Generate token for verified users
  @Post('generate-token')
  @ApiOperation({ summary: 'Generate access token for verified user' })
  @ApiBody({ schema: { type: 'object', properties: { walletAddress: { type: 'string' } }, required: ['walletAddress'] } })
  @ApiResponse({ status: 200, description: 'Token generated successfully' })
  @ApiResponse({ status: 400, description: 'Token generation failed' })
  async generateToken(@Body() body: { walletAddress: string }) {
    try {
      const result = await this.authService.generateTokenForVerifiedUser(body.walletAddress);
      
      return {
        success: true,
        data: result,
        message: 'Token generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate token',
        error: error.message,
      };
    }
  }
}