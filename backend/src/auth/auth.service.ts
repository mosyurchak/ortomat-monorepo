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

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log('❌ User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Перевірка верифікації email (тимчасово вимкнено)
    // if (!user.isVerified) {
    //   console.log('❌ Email not verified');
    //   throw new UnauthorizedException('Please verify your email first');
    // }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ User validated:', user.email);

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
   * Реєстрація тільки для лікарів
   */
  async register(registerDto: RegisterDto) {
    console.log('📝 Registering new doctor:', registerDto.email);

    // Перевіряємо чи email не зайнятий
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Створюємо користувача з ТІЛЬКИ валідними полями
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      role: 'DOCTOR', // Завжди DOCTOR для реєстрації
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      middleName: registerDto.middleName || null,
      phone: registerDto.phone,
      isVerified: true, // ✅ Тимчасово true для тестування без email
    });

    console.log('✅ Doctor registered:', user.email);

    // ⚠️ ТИМЧАСОВО ВИМКНЕНО - email відправка
    // Розкоментуйте коли налаштуєте SMTP правильно
    /*
    try {
      await this.emailService.sendVerificationEmail(
        user.id,
        user.email,
        user.firstName,
      );
      console.log('✅ Verification email sent');
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      // Не кидаємо помилку, щоб реєстрація пройшла успішно
    }
    */

    return {
      message: 'Registration successful. You can now login.',
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
      // Не розкриваємо чи існує користувач
      return {
        message: 'If this email exists, you will receive a password reset link',
      };
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
      // Перевіряємо токен
      const { userId } = await this.emailService.verifyResetToken(token);

      // Хешуємо новий пароль
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Оновлюємо пароль
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
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
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