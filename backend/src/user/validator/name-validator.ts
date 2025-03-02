import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { User } from '../../schemas/user.schema';
import { UserService } from 'src/user/user.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsNameUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly userService: UserService) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    console.log("------------------")
    console.log(this.userService)
    const { firstName, lastName } = args.object as any;
    const user = await this.userService.findByFullName(firstName, lastName);
    return !user;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'The combination of firstName and lastName must be unique.';
  }
}

export function IsNameUnique(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNameUniqueConstraint,
    });
  };
}