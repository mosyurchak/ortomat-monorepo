import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { InviteService } from '../invite/invite.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private inviteService: InviteService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('🔍 Validating user:', email);
    console.log('🔑 Password from request:', password);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log('❌ User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('💾 Stored password hash:', user.password);
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
   * Реєстрація лікаря (з можливістю через invite)
   */
  async register(registerDto: RegisterDto & { inviteToken?: string }) {
    console.log('📝 Registering new doctor:', registerDto.email);
    console.log('🔑 Password from request:', registerDto.password);
    
    // Перевірка invite токену якщо є
    if (registerDto.inviteToken) {
      console.log('🎫 Validating invite token:', registerDto.inviteToken);
      const inviteValidation = await this.inviteService.validateInvite(registerDto.inviteToken);
      
      if (!inviteValidation.valid) {
        throw new BadRequestException('Invalid or expired invite link');
      }
      
      console.log('✅ Invite valid for ortomat:', inviteValidation.ortomatName);
    }

    // Перевіряємо чи email не зайнятий
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      console.log('❌ Email already registered');
      throw new BadRequestException('Email already registered');
    }

    // Хешуємо пароль
    console.log('🔐 Hashing password with bcrypt (10 rounds)...');
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    console.log('💾 Hashed password generated:', hashedPassword);

    // Створюємо користувача
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      role: 'DOCTOR',
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      middleName: registerDto.middleName || null,
      phone: registerDto.phone,
      isVerified: false,
    });

    console.log('✅ Doctor registered successfully:', user.email);

    // Якщо є invite токен - призначаємо до ортомата
    if (registerDto.inviteToken) {
      try {
        await this.inviteService.useInvite(registerDto.inviteToken, user.id);
        console.log('✅ Doctor assigned to ortomat via invite');
      } catch (error) {
        console.error('❌ Failed to use invite:', error.message);
        // Не кидаємо помилку, лікар вже створений
      }
    }

    // Відправляємо email верифікації
    try {
      await this.emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.firstName,
      );
      console.log('✅ Verification email sent to:', user.email);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }

    return {
      message: registerDto.inviteToken 
        ? 'Registration successful. You have been assigned to an ortomat. Please check your email to verify your account.'
        : 'Registration successful. Please check your email to verify your account.',
      userId: user.id,
      email: user.email,
    };
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
      console.log('❌ User not found');
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      console.log('⚠️ Email already verified');
      throw new BadRequestException('Email already verified');
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
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      message: 'Verification email sent. Please check your inbox.',
    };
  }
}
