import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RentalContractEntity } from '../ejar/entities/rental-contract.entity';
import { RequestUser } from '../../common/decorators/current-user.decorator';

import { DufaatPlanEntity } from './entities/dufaat-plan.entity';
import { DufaatInstallmentEntity } from './entities/dufaat-installment.entity';
import { CreateDufaatPlanDto } from './dto/dufaat.dto';

const PLATFORM_FEE_RATE = 2; // 2 %

@Injectable()
export class DufaatService {
  constructor(
    @InjectRepository(DufaatPlanEntity)
    private readonly plans: Repository<DufaatPlanEntity>,
    @InjectRepository(DufaatInstallmentEntity)
    private readonly installments: Repository<DufaatInstallmentEntity>,
    @InjectRepository(RentalContractEntity)
    private readonly contracts: Repository<RentalContractEntity>,
  ) {}

  async createPlan(
    actor: RequestUser,
    dto: CreateDufaatPlanDto,
  ): Promise<DufaatPlanEntity> {
    const contract = await this.contracts.findOne({
      where: { id: dto.rentalContractId },
    });
    if (!contract) throw new NotFoundException('Rental contract not found');
    if (contract.tenantUserId !== actor.id) {
      throw new ForbiddenException('Only the tenant can apply for Dufaat');
    }

    const existing = await this.plans.findOne({
      where: { rentalContractId: contract.id },
    });
    if (existing) {
      throw new BadRequestException('A Dufaat plan already exists for this contract');
    }

    const annual = Number(contract.annualRent);
    const monthly = Number((annual / 12).toFixed(2));
    const fee = Number(((annual * PLATFORM_FEE_RATE) / 100).toFixed(2));

    const plan = this.plans.create({
      rentalContractId: contract.id,
      tenantId: contract.tenantUserId,
      landlordId: contract.landlordUserId,
      totalAnnualAmount: annual.toFixed(2),
      monthlyInstallment: monthly.toFixed(2),
      platformFeeRate: PLATFORM_FEE_RATE.toFixed(2),
      platformFee: fee.toFixed(2),
      status: 'active',
      startDate: contract.startDate,
      endDate: contract.endDate,
    });
    const saved = await this.plans.save(plan);

    // Generate 12 monthly installments aligned to the start date.
    const startDate = new Date(contract.startDate);
    const rows: DufaatInstallmentEntity[] = [];
    for (let i = 0; i < 12; i++) {
      const due = new Date(startDate);
      due.setMonth(due.getMonth() + i);
      rows.push(
        this.installments.create({
          planId: saved.id,
          tenantId: contract.tenantUserId,
          dueDate: due.toISOString().slice(0, 10),
          amount: monthly.toFixed(2),
          status: 'pending',
        }),
      );
    }
    await this.installments.save(rows);

    return this.findById(saved.id);
  }

  async findById(id: string): Promise<DufaatPlanEntity> {
    const plan = await this.plans.findOne({
      where: { id },
      relations: { installments: true },
      order: { installments: { dueDate: 'ASC' } },
    });
    if (!plan) throw new NotFoundException('Dufaat plan not found');
    return plan;
  }

  async listForTenant(tenantId: string): Promise<DufaatPlanEntity[]> {
    return this.plans.find({
      where: { tenantId },
      relations: { installments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async listForLandlord(landlordId: string): Promise<DufaatPlanEntity[]> {
    return this.plans.find({
      where: { landlordId },
      relations: { installments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async payInstallment(
    actor: RequestUser,
    installmentId: string,
  ): Promise<DufaatInstallmentEntity> {
    const installment = await this.installments.findOne({
      where: { id: installmentId },
    });
    if (!installment) throw new NotFoundException('Installment not found');
    if (installment.tenantId !== actor.id) {
      throw new ForbiddenException('Only the tenant can pay this installment');
    }
    if (installment.status === 'paid') {
      return installment;
    }
    installment.status = 'paid';
    installment.paidAt = new Date();
    // In a real Moyasar flow we'd kick off a payment here and update on
    // webhook callback. For now we mark it paid synchronously.
    return this.installments.save(installment);
  }
}
