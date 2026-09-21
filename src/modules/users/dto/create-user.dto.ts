import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserRoleInput {
  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}

export class UserBranchInput {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username hanya boleh huruf, angka, titik, underscore, dan strip',
  })
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserRoleInput)
  roles?: UserRoleInput[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserBranchInput)
  branches?: UserBranchInput[];
}