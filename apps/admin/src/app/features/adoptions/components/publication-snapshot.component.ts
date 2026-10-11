import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import type { Publication } from '../models/publication';
@Component({
  selector: 'app-publication-snapshot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publication-snapshot.component.html',
})
export class PublicationSnapshotComponent {
  readonly labels: Record<string, string> = {
    dog: 'Perro',
    cat: 'Gato',
    bird: 'Ave',
    rabbit: 'Conejo',
    reptile: 'Reptil',
    rodent: 'Roedor',
    equine: 'Equino',
    other: 'Otra',
    male: 'Macho',
    female: 'Hembra',
    unknown: 'Sin determinar',
    small: 'Pequeño',
    medium: 'Mediano',
    large: 'Grande',
    extra_large: 'Muy grande',
  };
  readonly publication = input.required<Publication>();
  readonly photograph = output<string>();
}
