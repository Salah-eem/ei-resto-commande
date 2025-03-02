import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { UserDto } from './dto/user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {

    constructor(@InjectModel(User.name) private readonly userModel: mongoose.Model<User>) {}
    
    async findAll(): Promise<UserDto[]> {
        return await this.userModel.find().exec();
    }

    async findById(id: string): Promise<UserDto | null> {
        return await this.userModel.findById(id).exec();
    }

    async findByEmail(email: string): Promise<UserDto | null> {
        return await this.userModel.findOne({email: email}).exec();
    }

    
    async findByFullName(firstName: string, lastName: string): Promise<UserDto | null> {
        return await this.userModel.findOne({firstName: firstName, lastName: lastName}).exec();
    }

    async create(dto: CreateUserDto): Promise<UserDto> {
        // const newUser = new this.userModel(dto); // Crée l'instance
        // await newUser.save(); // Enregistre l'instance dans la base de données
        const userWithFullName = await this.findByFullName(dto.firstName, dto.lastName);
        if (userWithFullName) {
            throw new BadRequestException('The combination of firstName and lastName must be unique.');
        }
        const userWithEmail = await this.findByEmail(dto.email);
        if (userWithEmail) {
            throw new BadRequestException('Email must be unique.');
        }

        return await this.userModel.create(dto);
    }

    async update(id: string, dto: UpdateUserDto): Promise<UserDto | null> {
        
        return this.userModel.findByIdAndUpdate(id, dto , { new: true }).exec();
    }

    async delete(userId: string) {
        return await this.userModel.findByIdAndDelete(userId).exec();
    }

    async deleteAll() {
        return await this.userModel.deleteMany({}).exec();
    }


}
