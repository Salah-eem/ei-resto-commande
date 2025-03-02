import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
//import { JwtGuard } from '../auth/guard';
//import { JwtGuard } from '../auth/guard/jwt.guard';

import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

//@UseGuards(JwtGuard)
@Controller('user')
export class UserController {

    constructor(private userService: UserService) {}

    @Get('me')
    getProfile(@Request() req) {
        // ✅ Récupérer l'utilisateur connecté automatiquement
        return {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        };
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
