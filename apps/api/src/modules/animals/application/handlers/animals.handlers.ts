import { ApplicationError } from '../../../../shared/domain/application-error';
import { administrativeReason } from '../../../../shared/domain/authorization';
import type {
  Clock,
  Entropy,
} from '../../../../shared/application/runtime-ports';
import type { UsersDirectory } from '../../../users/application/ports/out/users-directory';
import type { Authorization } from '../../../authorization/application/ports/in/authorization';
import type { Media } from '../../../media/application/ports/in/media';
import {
  Animal,
  ANIMAL_STATUSES,
  SPECIES,
} from '../../domain/aggregates/animal';
import type { AnimalResult } from '../results/animal';
import type {
  AnimalsRepository,
  AnimalsWork,
} from '../ports/out/animals-repository';
import type { AnimalsUseCases } from '../ports/in/animals-use-cases';
import type { AnimalsCatalog } from '../ports/in/animals-catalog';
import type {
  CreateAnimalCommand,
  UpdateAnimalCommand,
  AnimalDecisionCommand,
  UploadAnimalPhotoCommand,
  RemoveAnimalPhotoCommand,
} from '../commands/animal.commands';
import type {
  GetAnimalQuery,
  ListAnimalsQuery,
} from '../queries/animal.queries';
export class AnimalsHandlers implements AnimalsUseCases, AnimalsCatalog {
  constructor(
    private readonly repository: AnimalsRepository,
    private readonly users: UsersDirectory,
    private readonly authorization: Authorization,
    private readonly media: Media,
    private readonly clock: Clock,
    private readonly entropy: Entropy,
  ) {}
  private async access(
    actorId: string,
    state: Pick<AnimalResult, 'ownerUserId' | 'organizationId'>,
  ) {
    const actor = await this.users.findById(actorId);
    if (!actor || actor.status !== 'active' || !actor.emailVerifiedAt)
      throw new ApplicationError(
        'FORBIDDEN',
        'An active verified account is required.',
      );
    if (state.organizationId)
      await this.authorization.requirePermission(
        actorId,
        'animals.manage',
        state.organizationId,
      );
    else if (
      state.ownerUserId !== actorId &&
      actor.globalRole !== 'super_admin'
    )
      throw new ApplicationError('FORBIDDEN', 'Animal ownership is required.');
  }
  private async load(work: AnimalsWork, id: string) {
    const state = await work.find(id);
    if (!state)
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Animal was not found.');
    return Animal.restore(state);
  }
  private async locked(work: AnimalsWork, actorId: string, id: string) {
    await work.lock(`user:${actorId}`);
    const state = (await this.load(work, id)).snapshot();
    if (state.organizationId)
      await work.lock(`organization:${state.organizationId}`);
    await work.lock(`animal:${id}`);
    const animal = await this.load(work, id);
    await this.access(actorId, animal.snapshot());
    return animal;
  }
  private audit(
    work: AnimalsWork,
    actorId: string,
    id: string,
    action: string,
    reason: string,
    requestId: string,
  ) {
    return work.audit({
      id: this.entropy.id(),
      actorId,
      animalId: id,
      action,
      reason: administrativeReason(reason),
      requestId,
      createdAt: this.clock.now(),
    });
  }
  create(command: CreateAnimalCommand) {
    const reason = administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      await work.lock(`user:${command.actorId}`);
      if (command.organizationId)
        await work.lock(`organization:${command.organizationId}`);
      await this.access(command.actorId, {
        ownerUserId: command.organizationId ? null : command.actorId,
        organizationId: command.organizationId,
      });
      const state = Animal.create(
        this.entropy.id(),
        command.profile,
        command.organizationId ? null : command.actorId,
        command.organizationId,
        this.clock.now(),
      ).snapshot();
      await work.create(state);
      await this.audit(
        work,
        command.actorId,
        state.id,
        'animal.created',
        reason,
        command.requestId,
      );
      return state;
    });
  }
  get(query: GetAnimalQuery) {
    return this.repository.run(async (work) => {
      const state = (await this.load(work, query.animalId)).snapshot();
      await this.access(query.actorId, state);
      return { ...state, photos: await work.photos(state.id) };
    });
  }
  list(query: ListAnimalsQuery) {
    if (
      !Number.isInteger(query.page) ||
      query.page < 1 ||
      query.page > 100000 ||
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 100 ||
      (query.species &&
        !(SPECIES as readonly string[]).includes(query.species)) ||
      (query.status &&
        !(ANIMAL_STATUSES as readonly string[]).includes(query.status))
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid animal filters.');
    return this.repository.run(async (work) => {
      await this.access(query.actorId, {
        ownerUserId: query.actorId,
        organizationId: query.organizationId,
      });
      return work.list(query);
    });
  }
  update(command: UpdateAnimalCommand) {
    administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, command.actorId, command.animalId);
      animal.expectVersion(command.expectedVersion);
      if (animal.update(command.profile, this.clock.now())) {
        await work.save(animal.snapshot());
        await this.audit(
          work,
          command.actorId,
          command.animalId,
          'animal.updated',
          command.reason,
          command.requestId,
        );
      }
      return animal.snapshot();
    });
  }
  status(command: AnimalDecisionCommand) {
    administrativeReason(command.reason);
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, command.actorId, command.animalId);
      if (
        animal.snapshot().status === 'archived' &&
        command.status === 'archived'
      )
        return animal.snapshot();
      animal.expectVersion(command.expectedVersion);
      if (!command.status)
        throw new ApplicationError(
          'INVALID_INPUT',
          'An animal status is required.',
        );
      if (animal.status(command.status, this.clock.now())) {
        await work.save(animal.snapshot());
        await this.audit(
          work,
          command.actorId,
          command.animalId,
          'animal.status_changed',
          command.reason,
          command.requestId,
        );
      }
      return animal.snapshot();
    });
  }
  upload(command: UploadAnimalPhotoCommand) {
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, command.actorId, command.animalId);
      animal.expectVersion(command.expectedVersion);
      const photos = await work.photos(command.animalId);
      if (photos.length >= 10)
        throw new ApplicationError(
          'CONFLICT',
          'An animal may have at most ten photos.',
        );
      animal.touch(this.clock.now());
      const image = await this.media.prepare(command.bytes, command.mime),
        asset = await this.media.store(
          command.actorId,
          command.animalId,
          image,
        );
      await work.attach({
        id: this.entropy.id(),
        animalId: command.animalId,
        mediaId: asset.id,
        position: photos.reduce((max, p) => Math.max(max, p.position), -1) + 1,
        createdAt: this.clock.now(),
      });
      await work.save(animal.snapshot());
      await this.audit(
        work,
        command.actorId,
        command.animalId,
        'animal.photo_added',
        command.reason,
        command.requestId,
      );
      return {
        ...animal.snapshot(),
        photos: await work.photos(command.animalId),
      };
    });
  }
  removePhoto(command: RemoveAnimalPhotoCommand) {
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, command.actorId, command.animalId);
      animal.expectVersion(command.expectedVersion);
      const photo = (await work.photos(command.animalId)).find(
        (p) => p.mediaId === command.mediaId,
      );
      if (!photo)
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Photo was not found.',
        );
      animal.touch(this.clock.now());
      await work.removePhoto(photo.id);
      await this.media.remove(
        photo.mediaId,
        command.animalId,
        this.clock.now(),
      );
      await work.save(animal.snapshot());
      await this.audit(
        work,
        command.actorId,
        command.animalId,
        'animal.photo_removed',
        command.reason,
        command.requestId,
      );
      return animal.snapshot();
    });
  }
  photo(query: GetAnimalQuery, mediaId: string) {
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, query.actorId, query.animalId);
      if (
        !(await work.photos(animal.snapshot().id)).some(
          (p) => p.mediaId === mediaId,
        )
      )
        throw new ApplicationError(
          'RESOURCE_NOT_FOUND',
          'Photo was not found.',
        );
      return (await this.media.read(mediaId, query.animalId)).bytes;
    });
  }
  audits(query: GetAnimalQuery, page: number, limit: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new ApplicationError('INVALID_INPUT', 'Invalid pagination.');
    return this.repository.run(async (work) => {
      const state = (await this.load(work, query.animalId)).snapshot();
      await this.access(query.actorId, state);
      return work.audits(state.id, page, limit);
    });
  }
  private identity(animal: AnimalResult) {
    return {
      id: animal.id,
      organizationId: animal.organizationId,
      status: animal.status,
      version: animal.version,
    };
  }
  forBooking(actorId: string, animalId: string) {
    return this.repository.run(async (work) => {
      await work.lock(`animal:${animalId}`);
      const animal = await work.find(animalId);
      if (
        !animal ||
        animal.ownerUserId !== actorId ||
        animal.organizationId ||
        animal.status !== 'active'
      )
        throw new ApplicationError(
          'FORBIDDEN',
          'An active personal pet owned by the booking customer is required.',
        );
      return { id: animal.id, name: animal.name, species: animal.species };
    });
  }
  find(id: string) {
    return this.repository.run(async (work) => {
      const animal = await work.find(id);
      return animal ? this.identity(animal) : null;
    });
  }
  cards(ids: string[]) {
    if (ids.length > 200)
      throw new ApplicationError(
        'INVALID_INPUT',
        'Too many animal identities.',
      );
    return this.repository.run(async (work) => {
      const [animals, photos] = await Promise.all([
        work.findMany(ids),
        work.photosMany(ids),
      ]);
      return animals.map((animal) => ({
        animal: this.identity(animal),
        card: {
          id: animal.id,
          name: animal.name,
          species: animal.species,
          breed: animal.breed,
          sex: animal.sex,
          size: animal.size,
          dateOfBirth: animal.dateOfBirth,
          birthDateEstimated: animal.birthDateEstimated,
          color: animal.color,
          description: animal.description,
          specialNeeds: animal.specialNeeds,
          photos: photos.filter((p) => p.animalId === animal.id),
        },
      }));
    });
  }
  completeAdoption(
    actorId: string,
    animalId: string,
    reason: string,
    requestId: string,
  ) {
    return this.repository.run(async (work) => {
      const animal = await this.locked(work, actorId, animalId);
      animal.adopt(this.clock.now());
      await work.save(animal.snapshot());
      await this.audit(
        work,
        actorId,
        animalId,
        'animal.adopted',
        reason,
        requestId,
      );
    });
  }
}
