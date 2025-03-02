import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from 'src/schemas/user.schema';
import { IsEmailUniqueConstraint } from 'src/user/validator/email-validator';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema}])],
  controllers: [UserController],
  providers: [UserService, IsEmailUniqueConstraint]
})
export class UserModule {}
