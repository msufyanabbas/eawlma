import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { ListingEntity } from '../listings/entities/listing.entity';
import { RequestUser } from '../../common/decorators/current-user.decorator';

import { RentalContractEntity } from './entities/rental-contract.entity';
import { CreateRentalContractDto } from './dto/rental-contract.dto';

interface EjarRemoteContract {
  contractId: string;
  contractNumber: string;
  status: string;
  ejarUrl: string;
}

const EJAR_BASE = 'https://api.ejar.sa/v1';

/**
 * Wraps Saudi Arabia's official Ejar rental-contract platform. When the
 * `EJAR_API_KEY` env var is missing we fall back to a deterministic mock so
 * the rest of the contract flow stays exercisable in dev and CI.
 */
@Injectable()
export class EjarService {
  private readonly logger = new Logger(EjarService.name);

  constructor(
    @InjectRepository(RentalContractEntity)
    private readonly contracts: Repository<RentalContractEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    private readonly config: ConfigService,
  ) {}

  private get isConfigured(): boolean {
    return Boolean(this.config.get<string>('EJAR_API_KEY'));
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(
    actor: RequestUser,
    dto: CreateRentalContractDto,
  ): Promise<RentalContractEntity> {
    const listing = await this.listings.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    // Try to push the contract through Ejar first so the local row is created
    // with the remote identifiers populated. On failure (or in dev) we still
    // create the local row in `draft` status and the user can retry.
    let remote: EjarRemoteContract | null = null;
    try {
      remote = await this.callEjarCreate({ ...dto, listing, actor });
    } catch (err) {
      this.logger.warn(`Ejar createContract failed: ${(err as Error).message}`);
    }

    const entity = this.contracts.create({
      listingId: dto.listingId,
      agentId: listing.ownerId,
      landlordUserId: listing.ownerId,
      tenantUserId: dto.tenantUserId,
      tenantNationalId: dto.tenantNationalId,
      landlordNationalId: dto.landlordNationalId ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      monthlyRent: dto.monthlyRent.toFixed(2),
      annualRent: dto.annualRent.toFixed(2),
      ejarContractId: remote?.contractId ?? null,
      ejarContractNumber: remote?.contractNumber ?? null,
      ejarUrl: remote?.ejarUrl ?? null,
      status: remote ? 'pending_signatures' : 'draft',
    });
    return this.contracts.save(entity);
  }

  async listForUser(userId: string): Promise<RentalContractEntity[]> {
    return this.contracts
      .createQueryBuilder('c')
      .where('c.tenant_user_id = :id OR c.landlord_user_id = :id', { id: userId })
      .orderBy('c.created_at', 'DESC')
      .getMany();
  }

  async getOne(id: string, actor: RequestUser): Promise<RentalContractEntity> {
    const contract = await this.contracts.findOne({ where: { id } });
    if (!contract) throw new NotFoundException('Rental contract not found');
    if (
      contract.tenantUserId !== actor.id &&
      contract.landlordUserId !== actor.id &&
      contract.agentId !== actor.id
    ) {
      throw new ForbiddenException('You do not have access to this contract');
    }
    return contract;
  }

  async refreshStatus(id: string, actor: RequestUser): Promise<RentalContractEntity> {
    const contract = await this.getOne(id, actor);
    if (!contract.ejarContractId) return contract;
    try {
      const remote = await this.callEjarStatus(contract.ejarContractId);
      if (remote?.status) {
        contract.status = (remote.status as RentalContractEntity['status']) ?? contract.status;
        contract.ejarUrl = remote.ejarUrl ?? contract.ejarUrl;
        await this.contracts.save(contract);
      }
    } catch (err) {
      this.logger.warn(`Ejar status sync failed: ${(err as Error).message}`);
    }
    return contract;
  }

  async sign(id: string, actor: RequestUser): Promise<RentalContractEntity> {
    const contract = await this.getOne(id, actor);
    if (contract.status === 'draft' || contract.status === 'pending_signatures') {
      contract.status = 'active';
      await this.contracts.save(contract);
    }
    return contract;
  }

  // ---------------------------------------------------------------------------
  // Ejar API plumbing
  // ---------------------------------------------------------------------------

  private async callEjarCreate(input: {
    listing: ListingEntity;
    actor: RequestUser;
    monthlyRent: number;
    annualRent: number;
    startDate: string;
    endDate: string;
    tenantNationalId: string;
    landlordNationalId?: string;
  }): Promise<EjarRemoteContract> {
    if (!this.isConfigured) {
      return {
        contractId: `EJAR-MOCK-${Date.now()}`,
        contractNumber: String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)),
        status: 'pending_signatures',
        ejarUrl: 'https://ejar.sa/contract/view/mock',
      };
    }

    const res = await axios.post(
      `${EJAR_BASE}/contracts`,
      {
        listing_reference: input.listing.referenceCode,
        landlord_national_id: input.landlordNationalId ?? '',
        tenant_national_id: input.tenantNationalId,
        start_date: input.startDate,
        end_date: input.endDate,
        monthly_rent: input.monthlyRent,
        annual_rent: input.annualRent,
        unit_number: input.listing.referenceCode,
        city: input.listing.city,
      },
      {
        headers: { 'X-API-Key': this.config.getOrThrow<string>('EJAR_API_KEY') },
      },
    );

    return {
      contractId: res.data.contract_id ?? res.data.contractId ?? '',
      contractNumber: res.data.contract_number ?? res.data.contractNumber ?? '',
      status: res.data.status ?? 'pending_signatures',
      ejarUrl: res.data.url ?? res.data.ejar_url ?? '',
    };
  }

  private async callEjarStatus(
    ejarContractId: string,
  ): Promise<EjarRemoteContract | null> {
    if (!this.isConfigured) {
      return {
        contractId: ejarContractId,
        contractNumber: '',
        status: 'active',
        ejarUrl: 'https://ejar.sa/contract/view/mock',
      };
    }
    const res = await axios.get(`${EJAR_BASE}/contracts/${ejarContractId}`, {
      headers: { 'X-API-Key': this.config.getOrThrow<string>('EJAR_API_KEY') },
    });
    return {
      contractId: ejarContractId,
      contractNumber: res.data.contract_number ?? '',
      status: res.data.status ?? '',
      ejarUrl: res.data.url ?? res.data.ejar_url ?? '',
    };
  }
}
