import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Password tidak boleh diubah lewat endpoint update biasa.
// Ada endpoint khusus: PATCH /users/:id/password
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}