import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Role } from 'src/schemas/user.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@GetUser() user: any) {
    // Grâce au JwtGuard, req.user contient les informations du token
    // Par exemple, vous pouvez utiliser l'email pour récupérer le profil complet
    return this.userService.findByEmail(user.email);
  }

  @Roles(Role.Admin)
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

  @Public()
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return await this.userService.create(dto);
  }

  @Put('photo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/images/users',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async updatePhoto(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: any
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    // Met à jour le champ photoUrl de l'utilisateur
    const photoUrl = `/images/users/${file.filename}`;
    console.log('photoUrl', photoUrl);
    console.log('user', user);
    await this.userService.update(user.userId, { photoUrl });
    // Retourne le profil à jour
    return this.userService.findByEmail(user.email);
  }

  @Put(':id')
  async update(
    @GetUser() currentUser: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    console.log('currentUser', currentUser);
    console.log('id', id);  
    console.log('dto', dto);
    // Only admin can update the role
    if (dto.role !== undefined && currentUser.role != Role.Admin) {
      throw new ForbiddenException('Only admin can modify the user role');
    }
    return await this.userService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Roles(Role.Admin)
  @Delete('all')
  async deleteAll() {
    return await this.userService.deleteAll();
  }

  @Public()
  @Post('check-email')
  async checkEmail(@Body('email') email: string, @Body('userId') userId: string) {
    const isUnique = await this.userService.isEmailUnique(email, userId);
    return { unique: isUnique };
  }

  @Public()
  @Post('check-fullname')
  async checkFullName(@Body('firstName') firstName: string, @Body('lastName') lastName: string, @Body('userId') userId: string) {
    const isUnique = await this.userService.isFullNameUnique(firstName, lastName, userId);
    return { unique: isUnique };
  }

}
