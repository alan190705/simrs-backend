import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier: string; // bisa diisi username ATAU email

  @IsString()
  @MinLength(6)
  password: string;
}