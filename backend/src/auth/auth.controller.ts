import { Controller, Post, Body, UseGuards, Request, Get, Query, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 📝 Реєстрація (тільки для лікарів)
   * ✅ SECURITY: Rate limited to 3 requests per hour to prevent spam
   */
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 🔐 Логін
   * ✅ SECURITY: Rate limited to 5 attempts per minute to prevent brute force
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  async login(@Request() req) {
    console.log('🔐 Login request:', req.user.email);
    return this.authService.login(req.user);
  }

  /**
   * ✅ Верифікація email
   * GET /auth/verify-email?token=xxx
   */
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      return {
        success: false,
        message: 'Verification token is required',
      };
    }

    const result = await this.authService.verifyEmail(token);
    return {
      success: true,
      message: 'Email successfully verified. You can now login.',
      email: result.email,
    };
  }

  /**
   * 📧 Повторна відправка email верифікації
   * POST /auth/resend-verification
   * Body: { email: "user@example.com" }
   * ✅ SECURITY: Email validation through DTO
   */
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }

  /**
   * 🔑 Запит на відновлення паролю
   * POST /auth/forgot-password
   * Body: { email: "user@example.com" }
   * ✅ SECURITY: Rate limited to 3 attempts per 15 minutes + Email validation through DTO
   */
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 minutes
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * 🔐 Скидання паролю
   * POST /auth/reset-password
   * Body: { token: "xxx", newPassword: "xxx" }
   * ✅ SECURITY: Password validation through DTO (MinLength 8, MaxLength 128)
   */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}