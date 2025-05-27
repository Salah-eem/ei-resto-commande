import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { UserService } from 'src/user/user.service';
import { JwtGuard } from './guard/jwt.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema}]), 
    JwtModule.register({})
  ],
  providers: [
    AuthService, 
    JwtStrategy, 
    UserService
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
