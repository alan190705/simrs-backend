import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let message = 'Terjadi kesalahan pada server';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else {
        const b = body as { message?: string | string[] };
        if (Array.isArray(b.message)) { message = 'Validasi gagal'; errors = b.message; }
        else if (b.message) message = b.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = 409; message = 'Data sudah ada'; errors = [exception.meta?.target ?? []];
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = 404; message = 'Data tidak ditemukan';
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(status).json({ success: false, message, errors });
  }
}
