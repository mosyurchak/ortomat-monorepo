import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token має бути рядком' })
  @IsNotEmpty({ message: 'Refresh token обов\'язковий' })
  refresh_token: string;
}
