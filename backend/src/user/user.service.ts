import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/schemas/user.schema';
import { UserDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: mongoose.Model<User>,
  ) {}

  async findAll(): Promise<UserDto[]> {
    return await this.userModel.find().exec();
  }

  async findById(id: string): Promise<UserDto | null> {
    return await this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    return await this.userModel.findOne({ email: email }).exec();
  }

  async findOne(args: any): Promise<User | null> {
    return await this.userModel.findOne(args).exec();
  }

  async findByFullName(
    firstName: string,
    lastName: string,
  ): Promise<UserDto | null> {
    return await this.userModel
      .findOne({ firstName: firstName, lastName: lastName })
      .exec();
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    // const newUser = new this.userModel(dto); // Crée l'instance
    // await newUser.save(); // Enregistre l'instance dans la base de données
    const userWithFullName = await this.findByFullName(
      dto.firstName,
      dto.lastName,
    );
    if (userWithFullName) {
      throw new BadRequestException(
        'The combination of firstName and lastName must be unique.',
      );
    }
    const userWithEmail = await this.findByEmail(dto.email);
    if (userWithEmail) {
      throw new BadRequestException('Email must be unique.');
    }

    return await this.userModel.create(dto);
  }

  async createByAdmin(dto: UserDto): Promise<UserDto> {
    const userWithFullName = await this.findByFullName(
      dto.firstName,
      dto.lastName,
    );
    if (userWithFullName) {
      throw new BadRequestException(
        'The combination of firstName and lastName must be unique.',
      );
    }
    const userWithEmail = await this.findByEmail(dto.email);
    if (userWithEmail) {
      throw new BadRequestException('Email must be unique.');
    }
    const saltOrRounds = 10;
    dto.password = await bcrypt.hash(dto.password, saltOrRounds);
    return await this.userModel.create(dto);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDto | null> {
    if (dto.firstName && dto.lastName) {
      const existing = await this.userModel.findOne({
        firstName: dto.firstName,
        lastName: dto.lastName,
        _id: { $ne: id },
      });
      if (existing) {
        throw new BadRequestException(
          'The combination of firstName and lastName must be unique.',
        );
      }
    }
    if (dto.email) {
      const existing = await this.userModel.findOne({
        email: dto.email,
        _id: { $ne: id },
      });
      if (existing) {
        throw new BadRequestException('Email must be unique.');
      }
    }
    if (dto.password) {
      const saltOrRounds = 10;
      dto.password = await bcrypt.hash(dto.password, saltOrRounds);
    }

    return this.userModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(userId: string) {
    return await this.userModel.findByIdAndDelete(userId).exec();
  }

  async deleteAll() {
    return await this.userModel.deleteMany({}).exec();
  }

  async isEmailUnique(email: string, userId?: string): Promise<boolean> {
    const user = await this.userModel
      .findOne({ email, _id: { $ne: userId } })
      .exec();
    return !user;
  }

  async isFullNameUnique(
    firstName: string,
    lastName: string,
    userId?: string,
  ): Promise<boolean> {
    const user = await this.userModel
      .findOne({ firstName, lastName, _id: { $ne: userId } })
      .exec();
    return !user;
  }
}
