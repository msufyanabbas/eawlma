import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@eawlma/shared-types';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      issuer: config.get<string>('jwt.issuer'),
      audience: config.get<string>('jwt.audience'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const refreshToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
      refreshToken,
    };
  }
}
