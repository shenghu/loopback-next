// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: @loopback/repository-typeorm
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  EntityCrudRepository,
  Entity,
  DataObject,
  Options,
  Filter,
  Where,
} from '@loopback/repository';
import {
  getRepository,
  Repository,
  SelectQueryBuilder,
  QueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
} from 'typeorm';
import {DeepPartial} from 'typeorm/common/DeepPartial';
import {OrderByCondition} from 'typeorm/find-options/OrderByCondition';

import {TypeORMDataSource} from './typeorm-datasource';

import * as debugModule from 'debug';
const debug = debugModule('loopback:repository:typeorm');

export class TypeORMRepository<T extends Entity, ID>
  implements EntityCrudRepository<T, ID> {
  typeOrmRepo: Repository<T>;

  constructor(
    public dataSource: TypeORMDataSource,
    public entityClass: typeof Entity & {prototype: T},
  ) {}

  private async init() {
    if (this.typeOrmRepo != null) return;
    this.typeOrmRepo = <Repository<T>>await this.dataSource.getRepository(
      this.entityClass,
    );
  }

  async save(entity: DataObject<T>, options?: Options): Promise<T | null> {
    await this.init();
    const result = await this.typeOrmRepo.save(<DeepPartial<T>>entity);
    return <T>result;
  }

  async update(entity: DataObject<T>, options?: Options): Promise<boolean> {
    await this.init();
    await this.typeOrmRepo.updateById(entity.getId(), <DeepPartial<T>>entity);
    return true;
  }

  async delete(entity: DataObject<T>, options?: Options): Promise<boolean> {
    await this.init();
    await this.typeOrmRepo.deleteById(entity.getId());
    return true;
  }

  async findById(id: ID, filter?: Filter, options?: Options): Promise<T> {
    await this.init();
    const result = await this.typeOrmRepo.findOneById(id);
    if (result == null) {
      throw new Error('Not found');
    }
    return result;
  }

  async updateById(
    id: ID,
    data: DataObject<T>,
    options?: Options,
  ): Promise<boolean> {
    await this.init();
    await this.typeOrmRepo.updateById(data.getId(), <DeepPartial<T>>data);
    return true;
  }

  async replaceById(
    id: ID,
    data: DataObject<T>,
    options?: Options,
  ): Promise<boolean> {
    await this.init();
    await this.typeOrmRepo.updateById(data.getId(), <DeepPartial<T>>data);
    return true;
  }

  async deleteById(id: ID, options?: Options): Promise<boolean> {
    await this.init();
    await this.typeOrmRepo.deleteById(id);
    return true;
  }

  async exists(id: ID, options?: Options): Promise<boolean> {
    await this.init();
    const result = await this.typeOrmRepo.findOneById(id);
    return result != null;
  }

  async create(dataObject: DataObject<T>, options?: Options): Promise<T> {
    await this.init();
    const result = await this.typeOrmRepo.save(<DeepPartial<T>>dataObject);
    return <T>result;
  }

  async createAll(
    dataObjects: DataObject<T>[],
    options?: Options,
  ): Promise<T[]> {
    await this.init();
    const result = await this.typeOrmRepo.save(<DeepPartial<T>[]>dataObjects);
    return <T[]>result;
  }

  async find(filter?: Filter, options?: Options): Promise<T[]> {
    await this.init();
    const queryBuilder = await this.buildQuery(filter);
    if (debug.enabled) debug('find: %s', queryBuilder.getSql());
    const result = queryBuilder.getMany();
    return result;
  }

  async updateAll(
    dataObject: DataObject<T>,
    where?: Where,
    options?: Options,
  ): Promise<number> {
    await this.init();
    const queryBuilder = await this.buildUpdate(dataObject, where);
    if (debug.enabled) debug('updateAll: %s', queryBuilder.getSql());
    const result = await queryBuilder.execute();
    return result;
  }

  async deleteAll(where?: Where, options?: Options): Promise<number> {
    await this.init();
    const queryBuilder = await this.buildDelete(where);
    if (debug.enabled) debug('deleteAll: %s', queryBuilder.getSql());
    const result = await queryBuilder.execute();
    return result;
  }

  async count(where?: Where, options?: Options): Promise<number> {
    await this.init();
    const result = await this.typeOrmRepo.count(<Partial<T>>where);
    return result;
  }

  async buildQuery(filter?: Filter): Promise<SelectQueryBuilder<T>> {
    await this.init();
    const queryBuilder = this.typeOrmRepo.createQueryBuilder();
    if (!filter) return queryBuilder;
    queryBuilder.limit(filter.limit).offset(filter.offset);
    if (filter.fields) {
      queryBuilder.select(Object.keys(filter.fields));
    }
    if (filter.order) {
      let orderBy: OrderByCondition = {};
      for (const o of filter.order) {
        Object.assign(orderBy, o);
      }
      queryBuilder.orderBy(orderBy);
    }
    if (filter.where) {
      // FIXME[rfeng]: Need to handle `and`, `or`, and other operators
      queryBuilder.where(filter.where);
    }
    return queryBuilder;
  }

  async buildUpdate(dataObject: DataObject<T>, where?: Where) {
    await this.init();
    let queryBuilder = this.typeOrmRepo
      .createQueryBuilder()
      .update(this.entityClass)
      .set(dataObject);
    if (where) queryBuilder.where(where);
    return queryBuilder;
  }

  async buildDelete(where?: Where) {
    await this.init();
    let queryBuilder = this.typeOrmRepo
      .createQueryBuilder()
      .delete()
      .from(this.entityClass);
    if (where) queryBuilder.where(where);
    return queryBuilder;
  }
}
