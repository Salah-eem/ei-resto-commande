import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import * as mongoose from 'mongoose';

@ValidatorConstraint({ name: 'UniqueFullName', async: true })
@Injectable()
export class UniqueFullName implements ValidatorConstraintInterface {
  constructor(@InjectModel(User.name) private readonly userModel?: mongoose.Model<User>) {}

  async validate(firstName: string, args: ValidationArguments) {
    if (!this.userModel) return true; // Avoid error if DI not available
    const lastName = (args.object as any).lastName;
    if (!firstName || !lastName) return true;
    const user = await this.userModel.findOne({ firstName, lastName });
    if (!user) return true;
    // If updating, allow if the found user is the same as the one being updated
    const id = (args.object as any).id || (args.object as any)._id;
    if (id && user._id.toString() === id.toString()) return true;
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'The combination of first name and last name must be unique.';
  }
}
