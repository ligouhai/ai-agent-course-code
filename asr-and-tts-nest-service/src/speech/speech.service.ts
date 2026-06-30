/*
 * @Date: 2026-06-15 10:11:07
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 10:50:50
 */
import { Inject, Injectable } from '@nestjs/common';
import { Client as AsrClient } from 'tencentcloud-sdk-nodejs/tencentcloud/services/asr/v20190614/asr_client';

interface UploadedAudio {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class SpeechService {
  constructor(@Inject('ASR_CLIENT') private readonly asrClient: AsrClient) {}

  async recognizeBySentence(file: UploadedAudio): Promise<string> {
    const audioBase64 = file.buffer.toString('base64');
    const params = {
      EngSerViceType: '16k_zh',
      SourceType: 1,
      Data: audioBase64,
      DataLen: file.buffer.length,
      VoiceFormat: 'ogg-opus',
    };
    const response = await this.asrClient.SentenceRecognition(params);
    return response.Result ?? '';
  }
}
