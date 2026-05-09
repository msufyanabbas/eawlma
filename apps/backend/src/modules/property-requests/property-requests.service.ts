import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PropertyRequestEntity, PropertyRequestStatus } from './entities/property-request.entity';
import { CreatePropertyRequestDto } from './dto/property-request.dto';

@Injectable()
export class PropertyRequestsService {
  constructor(
    @InjectRepository(PropertyRequestEntity)
    private readonly repo: Repository<PropertyRequestEntity>,
  ) {}

  async create(
    dto: CreatePropertyRequestDto,
    userId: string | null,
  ): Promise<PropertyRequestEntity> {
    const entity = this.repo.create({
      userId,
      propertyType: dto.propertyType,
      city: dto.city,
      minBudget: dto.minBudget != null ? dto.minBudget.toFixed(2) : null,
      maxBudget: dto.maxBudget != null ? dto.maxBudget.toFixed(2) : null,
      bedrooms: dto.bedrooms ?? null,
      message: dto.message ?? null,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail ?? null,
      status: 'open',
    });
    return this.repo.save(entity);
  }

  async listAll(status?: PropertyRequestStatus): Promise<PropertyRequestEntity[]> {
    const qb = this.repo
      .createQueryBuilder('pr')
      .orderBy('pr.created_at', 'DESC');
    if (status) qb.where('pr.status = :status', { status });
    return qb.getMany();
  }

  async listForUser(userId: string): Promise<PropertyRequestEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    id: string,
    status: PropertyRequestStatus,
  ): Promise<PropertyRequestEntity> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Property request not found');
    found.status = status;
    return this.repo.save(found);
  }
}
