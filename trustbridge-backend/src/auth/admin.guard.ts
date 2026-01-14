import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  constructor(
    private adminService: AdminService,
    jwtService: JwtService,
    configService: ConfigService,
    authService: AuthService,
  ) {
    super(jwtService, configService, authService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.walletAddress) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has admin privileges
    const adminStatus = await this.adminService.checkAdminStatus(user.walletAddress);
    
    if (!adminStatus.isAdmin) {
      throw new ForbiddenException('Insufficient admin privileges');
    }

    return true;
  }
}
