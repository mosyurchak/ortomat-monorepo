import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    this.logger.log('Validating user credentials');

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn('User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Перевірка: лікарі не можуть логінитись в адмінку
    if (user.role === 'DOCTOR') {
      this.logger.warn('Doctor attempted to login - access denied');
      throw new UnauthorizedException('Лікарі можуть користуватись тільки Telegram ботом');
    }

    // ✅ Перевірка наявності пароля (лікарі не мають пароля)
    if (!user.password) {
      this.logger.warn('User has no password');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn('Invalid password - bcrypt comparison failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User validated successfully: ${user.id}`);

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    this.logger.log(`User login attempt: ${user.id}`);

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    // ✅ SECURITY: Short-lived access token (15 minutes)
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // ✅ SECURITY: Long-lived refresh token (7 days)
    const refresh_token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    // ✅ SECURITY: Hash and store refresh token in database
    const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpiry: refreshTokenExpiry,
      },
    });

    this.logger.log(`Login successful for user: ${user.id}`);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * ✅ SECURITY: Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    this.logger.log('Refresh token attempt');

    try {
      // Verify refresh token signature and expiry
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find user with valid refresh token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken || !user.refreshTokenExpiry) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token expired in database
      if (user.refreshTokenExpiry < new Date()) {
        this.logger.warn(`Expired refresh token for user: ${user.id}`);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Verify refresh token hash
      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isValidRefreshToken) {
        this.logger.warn(`Invalid refresh token for user: ${user.id}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const newPayload = {
        email: user.email,
        sub: user.id,
        role: user.role,
      };

      const access_token = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });

      this.logger.log(`Token refreshed for user: ${user.id}`);

      return {
        access_token,
      };
    } catch (error) {
      this.logger.error(`Refresh token failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * ✅ SECURITY: Logout - invalidate refresh token
   */
  async logout(userId: string) {
    this.logger.log(`Logout attempt for user: ${userId}`);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiry: null,
      },
    });

    this.logger.log(`Logout successful for user: ${userId}`);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Реєстрація (deprecated - лікарі додаються через адмінку)
   * Залишено для сумісності, але не використовується
   */
  async register(registerDto: RegisterDto) {
    throw new BadRequestException('Registration is disabled. Please contact administrator.');
  }

  /**
   * Верифікація email
   */
  async verifyEmail(token: string) {
    this.logger.log('Email verification attempt');

    try {
      const result = await this.emailService.verifyEmailToken(token);
      this.logger.log('Email verified successfully');
      return result;
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Запит на відновлення паролю
   */
  async forgotPassword(email: string) {
    this.logger.log('Password reset requested');

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn('Password reset requested for non-existent user');
      return {
        message: 'If this email exists, you will receive a password reset link',
      };
    }

    // Перевірка rate limit (максимум 3 спроби за 24 години)
    try {
      await this.emailService.checkPasswordResetRateLimit(user.email);
    } catch (error) {
      this.logger.error('Rate limit exceeded for password reset');
      throw new BadRequestException(error.message);
    }

    try {
      await this.emailService.sendPasswordResetEmail(
        user.id,
        user.email,
        user.firstName,
      );
      this.logger.log('Password reset email sent successfully');
    } catch (error) {
      this.logger.error(`Password reset email sending failed: ${error.message}`);
      throw error; // Пробрасуємо помилку для інформування користувача
    }

    return {
      message: 'If this email exists, you will receive a password reset link',
    };
  }

  /**
   * Скидання паролю
   */
  async resetPassword(token: string, newPassword: string) {
    this.logger.log('Password reset attempt');

    try {
      const { userId } = await this.emailService.verifyResetToken(token);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.emailService.resetPassword(token, hashedPassword);

      this.logger.log(`Password reset successful for user: ${userId}`);

      return {
        message: 'Password successfully reset. You can now login with your new password.',
      };
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Повторна відправка email верифікації
   */
  async resendVerificationEmail(email: string) {
    this.logger.log('Resend verification email attempt');

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // ✅ SECURITY: Don't reveal user existence - return success message
      this.logger.warn('Verification email resend requested for non-existent user');
      return {
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }

    if (user.isVerified) {
      // ✅ SECURITY: Don't reveal verification status - return generic message
      this.logger.warn('Verification email resend for already verified user');
      return {
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }

    try {
      await this.emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.firstName,
      );
      this.logger.log('Verification email resent successfully');
    } catch (error) {
      this.logger.error(`Verification email sending failed: ${error.message}`);
      // ✅ SECURITY: Don't expose internal errors
      return {
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }

    return {
      message: 'If an account exists with this email, a verification email has been sent.',
    };
  }
}
