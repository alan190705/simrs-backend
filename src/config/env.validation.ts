import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength, validateSync } from 'class-validator';

enum NodeEnv { development = 'development', production = 'production', test = 'test' }
enum StorageDriverName { local = 'local', s3 = 's3' }

class EnvVars {
  @IsEnum(NodeEnv) NODE_ENV: NodeEnv = NodeEnv.development;
  @IsInt() @Min(1) PORT: number = 3000;
  @IsString() @MinLength(1) DATABASE_URL: string;
  @IsString() CORS_ORIGINS: string = 'http://localhost:5173';
  @IsString() @MinLength(32) JWT_SECRET: string;
  @IsString() @MinLength(32) JWT_REFRESH_SECRET: string;
  @IsString() JWT_ACCESS_TTL: string = '15m';
  @IsString() JWT_REFRESH_TTL: string = '7d';
  @IsEnum(StorageDriverName) STORAGE_DRIVER: StorageDriverName = StorageDriverName.local;
  @IsString() STORAGE_LOCAL_PATH: string = './storage';
  @IsOptional() @IsString() DEFAULT_BRANCH_CODE?: string;
}

/** Gagal cepat saat boot jika environment tidak lengkap. */
export function validateEnv(config: Record<string, unknown>) {
  const env = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    const detail = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n');
    throw new Error(`Konfigurasi environment tidak valid:\n${detail}`);
  }
  return env;
}
