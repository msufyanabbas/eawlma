import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { UserEntity } from '../users/entities/user.entity';

import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { EmailOtpEntity } from './entities/email-otp.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthController } from './auth.controller';
import { AuthenticaController } from './authentica.controller';
import { AuthenticaClient } from './authentica.client';
import { NafathService } from './nafath/nafath.service';
import { NafathController } from './nafath/nafath.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshTokenEntity, EmailOtpEntity, UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpiresIn', '15m'),
          issuer: config.get<string>('jwt.issuer'),
          audience: config.get<string>('jwt.audience'),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    JwtRefreshStrategy,
    AuthenticaClient,
    NafathService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [AuthController, AuthenticaController, NafathController],
  exports: [AuthService, JwtModule, AuthenticaClient, NafathService],
})
export class AuthModule {}
