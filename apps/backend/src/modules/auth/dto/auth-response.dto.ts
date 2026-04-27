import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Access token TTL in seconds' }) accessTokenExpiresIn: number;
  @ApiProperty({ description: 'Refresh token TTL in seconds' }) refreshTokenExpiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ type: AuthTokensDto }) tokens: AuthTokensDto;
}
