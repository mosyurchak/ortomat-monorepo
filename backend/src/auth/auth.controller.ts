import { Controller, Post, Body, UseGuards, Request, Get, Query, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 📝 Реєстрація (тільки для лікарів)
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 🔐 Логін
   */
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
   */
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body('email') email: string) {
    if (!email) {
      return {
        success: false,
        message: 'Email is required',
      };
    }

    return this.authService.resendVerificationEmail(email);
  }

  /**
   * 🔑 Запит на відновлення паролю
   * POST /auth/forgot-password
   * Body: { email: "user@example.com" }
   */
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      return {
        success: false,
        message: 'Email is required',
      };
    }

    return this.authService.forgotPassword(email);
  }

  /**
   * 🔐 Скидання паролю
   * POST /auth/reset-password
   * Body: { token: "xxx", newPassword: "xxx" }
   */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!token || !newPassword) {
      return {
        success: false,
        message: 'Token and new password are required',
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    return this.authService.resetPassword(token, newPassword);
  }
}