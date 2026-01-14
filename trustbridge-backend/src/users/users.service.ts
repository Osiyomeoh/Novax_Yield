import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().sort({ createdAt: -1 });
  }

  async getUserById(userId: string): Promise<User> {
    return this.userModel.findById(userId);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User> {
    return this.userModel.findOne({ walletAddress: walletAddress.toLowerCase() });
  }
}
