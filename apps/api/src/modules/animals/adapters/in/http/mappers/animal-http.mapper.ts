import type {
  AnimalResult,
  AnimalPhotoResult,
} from '../../../../application/results/animal';
export class AnimalHttpMapper {
  static animal(state: AnimalResult) {
    return {
      ...state,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      archivedAt: state.archivedAt?.toISOString() ?? null,
    };
  }
  static detail(state: AnimalResult & { photos: AnimalPhotoResult[] }) {
    return {
      ...AnimalHttpMapper.animal(state),
      photos: state.photos.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}
