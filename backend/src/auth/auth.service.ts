import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('🔍 Validating user:', email);
    
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      console.log('❌ User not found');
      throw new UnauthorizedException('Invalid credentials');
    }
    
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
      role: user.role 
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
      },
    };
  }

  async register(registerDto: RegisterDto) {
    console.log('📝 Registering new user:', registerDto.email);
    
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    console.log('✅ User registered:', user.email);

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }
}