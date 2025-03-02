import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) {

    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post('logout')
    logout() { 
        return this.authService.logout();
    }

    @Post('signup')
    signup(@Body() dto: CreateUserDto) { 
        return this.authService.signup(dto);
    }
}
