import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';

@Injectable()

export class MongooseService extends MongoClient {
  constructor(config: ConfigService) {
    super(config.get('DATABASE_URL')!);
  }

}