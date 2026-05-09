import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { EjarService } from './ejar.service';
import {
  CreateRentalContractDto,
  RentalContractResponseDto,
} from './dto/rental-contract.dto';

@ApiTags('rental-contracts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'rental-contracts', version: '1' })
export class EjarController {
  constructor(private readonly ejar: EjarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a rental contract and submit it to Ejar.' })
  async create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateRentalContractDto,
  ): Promise<RentalContractResponseDto> {
    const contract = await this.ejar.create(actor, dto);
    return RentalContractResponseDto.fromEntity(contract);
  }

  @Get('my')
  @ApiOperation({ summary: 'List rental contracts for the current user.' })
  async my(
    @CurrentUser() actor: RequestUser,
  ): Promise<RentalContractResponseDto[]> {
    const list = await this.ejar.listForUser(actor.id);
    return list.map(RentalContractResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single contract.' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<RentalContractResponseDto> {
    const contract = await this.ejar.getOne(id, actor);
    return RentalContractResponseDto.fromEntity(contract);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Refresh contract status from Ejar.' })
  async refreshStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<RentalContractResponseDto> {
    const contract = await this.ejar.refreshStatus(id, actor);
    return RentalContractResponseDto.fromEntity(contract);
  }

  @Post(':id/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a contract as signed.' })
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<RentalContractResponseDto> {
    const contract = await this.ejar.sign(id, actor);
    return RentalContractResponseDto.fromEntity(contract);
  }
}
