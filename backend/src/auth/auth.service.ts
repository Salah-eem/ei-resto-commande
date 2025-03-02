import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
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

    constructor(private userService: UserService,            
                private jwt: JwtService,
                private config: ConfigService,
                ) {}

    logout() {
        return "I logged out";
    }

    async signup(dto: CreateUserDto) {
        const saltOrRounds = 10;
        // generate the password hash
        dto.password = await bcrypt.hash(dto.password, saltOrRounds);
        // save the new user in the db
        try {
          const user = await this.userService.create(dto);
          return this.signToken(user.email, user.role.toString());
        } 
        catch (error) {
          throw error;
        }
    }
        
    async login(dto: LoginDto) {
        // find the user by email
        const user = await this.userService.findByEmail(dto.email);
        // if user does not exist throw exception
        if (!user)
            throw new ForbiddenException('Credentials incorrect',);

        // compare password
        const pwMatches = await bcrypt.compare(dto.password, user.password);
        // if password incorrect throw exception
        if (!pwMatches)
            throw new ForbiddenException('Credentials incorrect',);

        return this.signToken(user.email, user.role.toString());
    }


    async login2(dto: LoginDto, res: Response) {
        const user = await this.userService.findByEmail(dto.email);

        if (!user) {
            throw new ForbiddenException('Credentials incorrect');
        }

        const pwMatches = await bcrypt.compare(dto.password, user.password);
        if (!pwMatches) {
            throw new ForbiddenException('Credentials incorrect');
        }

        const token = await this.signToken(user.email, user.role.toString());

        // ✅ Envoyer le token dans un cookie sécurisé
        res.cookie('access_token', token.access_token, {
            httpOnly: true, // Le cookie ne peut pas être accessible par JavaScript
            secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
            sameSite: 'strict', // Protéger contre les attaques CSRF
            maxAge: 15 * 60 * 1000, // Expire après 15 minutes
        });

        return {
            message: 'Login successful',
        };
    }


    async signToken(email: string, role: string): Promise<{ access_token: string }> {
        const payload = {
            sub: email,
            role,
        };
        const secret = this.config.get('JWT_SECRET');

        const token = await this.jwt.signAsync(
        payload,
        {
            expiresIn: '15m',
            secret: secret,
        },
        );

        return {
            access_token: token,
        };
    }
}
