import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login-dto';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {

  constructor(
    private userService: UserService,            
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: CreateUserDto) {
    const saltOrRounds = 10;
    dto.password = await bcrypt.hash(dto.password, saltOrRounds);
    try {
      const user = await this.userService.create(dto);
      const userId = (user as any)._id?.toString() || (user as any).id?.toString();
      return this.signToken(userId, user.email, user.role.toString());
    } catch (error) {
      throw error;
    }
  }
        
  async login(dto: LoginDto) {
    const user = await this.userService.findOne({ email: dto.email });
    if (!user)
      throw new ForbiddenException('Credentials incorrect');
    const pwMatches = await bcrypt.compare(dto.password, user.password);
    if (!pwMatches)
      throw new ForbiddenException('Credentials incorrect');
    const userId = (user as any)._id?.toString() || (user as any).id?.toString();
    return this.signToken(userId, user.email, user.role.toString());
  }

  /**
   * Génère un access token (valable 15m) et un refresh token (valable 7j)
   */
  async signToken(userId: string, email: string, role: string): Promise<{ access_token: string, refresh_token: string }> {
    const payload = { sub: userId, email, role };
    const secret = this.config.get('JWT_SECRET');
    
    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: secret,
    });
    
    const refresh_token = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret: secret,
    });
    
    return { access_token, refresh_token };
  }

  /**
   * Endpoint de rafraîchissement : vérifie le refresh token, et génère de nouveaux tokens
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string, refresh_token: string }> {
    try {
      // Vérifier et décoder le refresh token
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      });
      // Vérifier que l'utilisateur existe (et éventuellement comparer le refresh token stocké)
      const user = await this.userService.findByEmail(payload.email);
      if (!user) {
        throw new ForbiddenException('Access Denied');
      }
      // Génère et retourne de nouveaux tokens
      const userId = (user as any)._id?.toString() || (user as any).id?.toString();
      return this.signToken(userId, user.email, user.role.toString());
    } catch (error) {
      throw new ForbiddenException('Invalid refresh token');
    }
  }
}
