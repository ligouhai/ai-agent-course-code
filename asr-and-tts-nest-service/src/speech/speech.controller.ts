/*
 * @Date: 2026-06-15 10:11:21
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 10:20:34
 */
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpeechService } from './speech.service';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  @Post('asr')
  @UseInterceptors(FileInterceptor('audio'))
  async recognize(
    @UploadedFile()
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请通过 FormData 的 audio字段上传音频文件');
    }
    const result = await this.speechService.recognizeBySentence({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
    return { result };
  }
}
