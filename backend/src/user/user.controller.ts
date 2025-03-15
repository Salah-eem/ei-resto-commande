import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
//import { JwtGuard } from '../auth/guard';
//import { JwtGuard } from '../auth/guard/jwt.guard';

import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';

//@UseGuards(JwtGuard)
@Controller('user')
export class UserController {

    constructor(private userService: UserService) {}

    // Endpoint pour récupérer le profil de l'utilisateur connecté
    @UseGuards(JwtGuard)
    @Get('profile')
    async getProfile(@GetUser() user: any) {
        // Grâce au JwtGuard, req.user contient les informations du token
        // Par exemple, vous pouvez utiliser l'email pour récupérer le profil complet
        return this.userService.findByEmail(user.email);
    }

    @Get()
    async getAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.userService.findById(id);
    }

    @Get('by-email/:email')
    async getByEmail(@Param('email') email: string) {
        return this.userService.findByEmail(email);
    }

    @Post()
    async create(@Body() dto: CreateUserDto) {
        return await this.userService.create(dto);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return await this.userService.update(id, dto);
    }

    @Delete(':id') 
    async delete(@Param('id') id: string) {
        return this.userService.delete(id);
    }

    @Delete()
    async deleteAll() {
        return await this.userService.deleteAll();
    }
  

}
