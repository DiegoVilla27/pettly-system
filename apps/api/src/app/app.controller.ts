import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
class ApiStatusResponseDto extends createZodDto(
  z.strictObject({
    message: z
      .string()
      .min(1)
      .meta({ description: 'API availability message.', example: 'Hello API' }),
  }),
) {}
@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @ApiOperation({
    operationId: 'getApiStatus',
    summary: 'Check API availability',
  })
  @ApiOkResponse({ type: ApiStatusResponseDto })
  @ZodSerializerDto(ApiStatusResponseDto)
  getData() {
    return this.appService.getData();
  }
}
