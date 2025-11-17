import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { AppError } from '../middleware/errorHandler';
import { UserTier } from '@prisma/client';
import { logger } from '../utils/logger';

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly SALT_ROUNDS = 10;

  async register(data: RegisterData) {
    const { email, username, password } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email or username already exists');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters long');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        tier: UserTier.USER, // Default tier for registered users
      },
      select: {
        id: true,
        email: true,
        username: true,
        tier: true,
        createdAt: true,
      },
    });

    // Create default settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    logger.info(`New user registered: ${user.email}`);

    // Generate token
    const token = this.generateToken(user.id, user.email, user.tier);

    return {
      user,
      token,
    };
  }

  async login(data: LoginData) {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

    // Generate token
    const token = this.generateToken(user.id, user.email, user.tier);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        tier: user.tier,
      },
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        tier: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        settings: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new AppError(400, 'New password must be at least 8 characters long');
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info(`Password updated for user: ${user.email}`);

    return { message: 'Password updated successfully' };
  }

  private generateToken(userId: string, email: string, tier: UserTier): string {
    return jwt.sign(
      { userId, email, tier },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  async verifyToken(token: string) {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }
}

export const authService = new AuthService();
