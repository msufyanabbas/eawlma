import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'amenities' })
@Index('uq_amenity_key', ['key'], { unique: true })
export class AmenityEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 200, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'varchar', length: 200, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 32 })
  category: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;
}
