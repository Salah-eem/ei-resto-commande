// auth.controller.ts
import { 
    Controller, 
    Post, 
    Body, 
    Res, 
    Req, 
    HttpCode, 
    HttpStatus, 
    ForbiddenException 
  } from '@nestjs/common';
  import { AuthService } from './auth.service';
  import { LoginDto } from './dto/login-dto';
  import { CreateUserDto } from 'src/user/dto/create-user.dto';
  import { Response, Request } from 'express';
  
  @Controller('auth')
  export class AuthController {
    constructor(private authService: AuthService) {}
  
    @Post('signup')
    async signup(
      @Body() dto: CreateUserDto,
      @Res({ passthrough: true }) res: Response
    ) {
      // Inscription et génération des tokens
      const tokens = await this.authService.signup(dto);
      // Envoyer les tokens dans des cookies sécurisés
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      });
      return tokens;
    }
  
    @Post('login')
    async login(
      @Body() dto: LoginDto,
      @Res({ passthrough: true }) res: Response
    ) {
      // Connexion et génération des tokens
      const tokens = await this.authService.login(dto);
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return tokens;
    }
  
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response
    ) {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        throw new ForbiddenException('Refresh token not provided');
      }
      // Utiliser le refresh token pour obtenir de nouveaux tokens
      const tokens = await this.authService.refreshToken(refreshToken);
      res.cookie('access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return tokens;
    }
  }
  