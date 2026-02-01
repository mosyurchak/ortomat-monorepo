import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('🔍 Validating user:', email);
    // ✅ SECURITY: Removed password logging

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log('❌ User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Перевірка: лікарі не можуть логінитись в адмінку
    if (user.role === 'DOCTOR') {
      console.log('❌ Doctor attempted to login - not allowed');
      throw new UnauthorizedException('Лікарі можуть користуватись тільки Telegram ботом');
    }

    // ✅ Перевірка наявності пароля (лікарі не мають пароля)
    if (!user.password) {
      console.log('❌ User has no password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ SECURITY: Removed hash logging
    console.log('🔐 Comparing passwords...');

    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log('✅ Password valid?', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password - bcrypt comparison failed');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ User validated successfully:', user.email);

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    console.log('🔐 Generating token for:', user.email);
    console.log('👤 User role from DB:', user.role);

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    console.log('✅ Login successful:', user.email, 'Role:', user.role);

    return {
      access_token,
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
    console.log('✉️ Verifying email with token:', token);

    try {
      const result = await this.emailService.verifyEmailToken(token);
      console.log('✅ Email verified:', result.email);
      return result;
    } catch (error) {
      console.log('❌ Email verification failed:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Запит на відновлення паролю
   */
  async forgotPassword(email: string) {
    console.log('🔑 Password reset requested for:', email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log('⚠️ User not found, but returning success message');
      return {
        message: 'If this email exists, you will receive a password reset link',
      };
    }

    // Перевірка rate limit (максимум 3 спроби за 24 години)
    try {
      await this.emailService.checkPasswordResetRateLimit(user.email);
    } catch (error) {
      console.error('🚫 Rate limit exceeded for:', email);
      throw new BadRequestException(error.message);
    }

    try {
      await this.emailService.sendPasswordResetEmail(
        user.id,
        user.email,
        user.firstName,
      );
      console.log('✅ Password reset email sent to:', email);
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
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
    console.log('🔐 Resetting password with token');

    try {
      const { userId } = await this.emailService.verifyResetToken(token);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log('💾 New hashed password generated');

      await this.emailService.resetPassword(token, hashedPassword);

      console.log('✅ Password reset successful for user:', userId);

      return {
        message: 'Password successfully reset. You can now login with your new password.',
      };
    } catch (error) {
      console.log('❌ Password reset failed:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Повторна відправка email верифікації
   */
  async resendVerificationEmail(email: string) {
    console.log('📧 Resending verification email to:', email);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // ✅ SECURITY: Don't reveal user existence - return success message
      console.log('⚠️ User not found, but returning success message');
      return {
        message: 'If an account exists with this email, a verification email has been sent.',
      };
    }

    if (user.isVerified) {
      // ✅ SECURITY: Don't reveal verification status - return generic message
      console.log('⚠️ Email already verified, returning generic message');
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
      console.log('✅ Verification email resent to:', email);
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
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
