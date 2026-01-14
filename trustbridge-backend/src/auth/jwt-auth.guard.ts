import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.authService.verifyToken(token);
      const user = await this.authService.getUserFromToken(token);
      
      // Attach user to request
      request.user = {
        ...payload,
        user,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get required role from metadata (set by @Roles decorator)
    const requiredRole = this.getRequiredRole(context);
    
    if (!requiredRole) {
      return true; // No role required
    }

    const hasRole = await this.authService.hasRole(user.sub, requiredRole);
    
    if (!hasRole) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    return true;
  }

  private getRequiredRole(context: ExecutionContext): string | undefined {
    // This would be set by a @Roles decorator
    // For now, we'll return undefined (no role required)
    return undefined;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get required permission from metadata (set by @Permission decorator)
    const requiredPermission = this.getRequiredPermission(context);
    
    if (!requiredPermission) {
      return true; // No permission required
    }

    const hasPermission = await this.authService.hasPermission(user.sub, requiredPermission);
    
    if (!hasPermission) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    return true;
  }

  private getRequiredPermission(context: ExecutionContext): string | undefined {
    // This would be set by a @Permission decorator
    // For now, we'll return undefined (no permission required)
    return undefined;
  }
}
