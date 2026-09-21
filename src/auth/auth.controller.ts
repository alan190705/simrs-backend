import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { RefreshDto } from './refresh-dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.login(dto.identifier, dto.password, userAgent, ip);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @Body() dto: RefreshDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authService.refresh(dto.refresh_token, userAgent, ip);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user;
  }
}