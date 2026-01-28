import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Невалідний формат email' })
  @IsNotEmpty({ message: 'Email обов\'язковий' })
  @MaxLength(255, { message: 'Email занадто довгий' })
  email: string;

  @IsString({ message: 'Пароль має бути рядком' })
  @IsNotEmpty({ message: 'Пароль обов\'язковий' })
  @MinLength(8, { message: 'Пароль має містити мінімум 8 символів' })
  @MaxLength(128, { message: 'Пароль занадто довгий' })
  password: string;

  @IsString({ message: 'Ім\'я має бути рядком' })
  @IsNotEmpty({ message: 'Ім\'я обов\'язкове' })
  @MaxLength(100, { message: 'Ім\'я занадто довге' })
  firstName: string;

  @IsString({ message: 'Прізвище має бути рядком' })
  @IsNotEmpty({ message: 'Прізвище обов\'язкове' })
  @MaxLength(100, { message: 'Прізвище занадто довге' })
  lastName: string;

  @IsString({ message: 'По-батькові має бути рядком' })
  @IsOptional()
  @MaxLength(100, { message: 'По-батькові занадто довге' })
  middleName?: string;

  @IsString({ message: 'Телефон має бути рядком' })
  @IsNotEmpty({ message: 'Телефон обов\'язковий' })
  @Matches(/^\+380\d{9}$/, { message: 'Телефон має бути у форматі +380XXXXXXXXX' })
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Invite token занадто довгий' })
  inviteToken?: string;
}
