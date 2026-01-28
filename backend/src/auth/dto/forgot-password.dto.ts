import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Невалідний формат email' })
  @IsNotEmpty({ message: 'Email обов\'язковий' })
  @MaxLength(255, { message: 'Email занадто довгий' })
  email: string;
}
