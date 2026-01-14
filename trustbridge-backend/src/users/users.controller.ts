import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers() {
    try {
      const users = await this.usersService.getAllUsers();
      return {
        success: true,
        data: users,
        message: `Found ${users.length} users`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get users'
      };
    }
  }
}
