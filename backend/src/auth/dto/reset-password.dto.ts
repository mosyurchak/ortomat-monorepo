import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Токен має бути рядком' })
  @IsNotEmpty({ message: 'Токен обов\'язковий' })
  token: string;

  @IsString({ message: 'Новий пароль має бути рядком' })
  @IsNotEmpty({ message: 'Новий пароль обов\'язковий' })
  @MinLength(8, { message: 'Пароль має містити мінімум 8 символів' })
  @MaxLength(128, { message: 'Пароль занадто довгий' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Пароль має містити: мінімум 1 велику літеру, 1 малу літеру, 1 цифру та 1 спецсимвол (@$!%*?&)'
    }
  )
  newPassword: string;
}
