import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'tags' })
@Index('uq_tag_key', ['key'], { unique: true })
export class TagEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 200, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'varchar', length: 200, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  color: string | null;
}
