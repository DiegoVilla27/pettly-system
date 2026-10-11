import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ResourceDetailStore } from '../state/resource-detail.store';
import { ResourceEditorComponent } from '../components/resource-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import {
  colombiaInstant,
  validBlockRange,
  blockSchema,
  releaseSchema,
  calendarTime,
} from '../mappers/resource.mapper';
import {
  colombiaDateTime,
  weekdays,
  type ResourceProfile,
  type ResourceContext,
} from '../models/resource';
@Component({
  selector: 'app-resource-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ResourceEditorComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ResourceDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-detail.page.html',
})
export class ResourceDetailPage {
  readonly store = inject(ResourceDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly context = toSignal(
    this.route.paramMap.pipe(
      map(
        (p) =>
          ({
            organizationId: p.get('organizationId') ?? '',
            resourceId: p.get('resourceId') ?? '',
          }) satisfies ResourceContext,
      ),
    ),
    { initialValue: null },
  );
  readonly colombiaDateTime = colombiaDateTime;
  readonly page = signal(1);
  readonly editing = signal(false);
  readonly calendarTime = calendarTime;
  readonly weekdays = weekdays;
  readonly formError = signal('');
  private readonly initial = Date.now() + 5 * 60000;
  readonly range = signal({
    from: new Date(this.initial).toISOString(),
    to: new Date(this.initial + 30 * 86400000).toISOString(),
  });
  readonly rangeForm = this.fb.group({
    from: [this.local(this.initial), Validators.required],
    to: [this.local(this.initial + 30 * 86400000), Validators.required],
  });
  readonly blockForm = this.fb.group({
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  readonly releaseForm = this.fb.group({
    blockId: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirmed: [false, Validators.requiredTrue],
  });
  readonly blocked = computed(
    () => this.store.busy() || this.store.refreshRequired(),
  );
  readonly blockQuery = computed(() => {
    const c = this.context(),
      r = this.store.resource(),
      q = this.range();
    return c && r ? { context: c, ...q, version: r.version } : null;
  });
  readonly auditQuery = computed(() => {
    const c = this.context(),
      r = this.store.resource();
    return c && r
      ? { context: c, page: this.page(), version: r.version }
      : null;
  });
  readonly actionLabels: Record<string, string> = {
    resource_created: 'Creación',
    resource_updated: 'Edición de agenda',
    resource_blocked: 'Bloqueo',
    block_released: 'Liberación de bloqueo',
  };
  constructor() {
    this.store.load(this.context);
    effect(() => {
      this.context();
      this.editing.set(false);
    });
    this.store.blocksQuery(this.blockQuery);
    this.store.auditQuery(this.auditQuery);
    effect(() => {
      const r = this.store.result(),
        c = this.context();
      if (r?.kind === 'resource') this.editing.set(false);
      if (r?.kind === 'resource' && c && !c.resourceId)
        void this.router.navigate(
          ['/servicios', r.resource.organizationId, 'recursos', r.resource.id],
          { replaceUrl: true },
        );
      if (r?.kind === 'block') {
        this.blockForm.reset();
        this.releaseForm.reset();
      }
    });
  }
  private local(ms: number) {
    return new Date(ms - 5 * 3600000).toISOString().slice(0, 16);
  }
  save(value: { profile: ResourceProfile; reason: string }) {
    const c = this.context(),
      r = this.store.resource();
    if (!c || this.blocked()) return;
    this.store.execute(
      r
        ? {
            kind: 'update',
            context: c,
            body: {
              organizationId: c.organizationId,
              expectedVersion: r.version,
              ...value,
            },
          }
        : {
            kind: 'create',
            body: { organizationId: c.organizationId, ...value },
          },
    );
  }
  refresh() {
    if (this.store.busy()) return;
    const c = this.context();
    if (c) {
      if (!c.resourceId && this.store.refreshRequired()) {
        void this.router.navigate(['/servicios/recursos'], {
          queryParams: { organizationId: c.organizationId },
        });
        return;
      }
      this.page.set(1);
      this.editing.set(false);
      this.store.load(c);
    }
  }
  searchBlocks() {
    const q = this.rangeForm.getRawValue(),
      from = colombiaInstant(q.from),
      to = colombiaInstant(q.to);
    if (!from || !to || !validBlockRange(from, to)) {
      this.formError.set(
        'Selecciona un intervalo futuro válido de hasta 210 días, en hora de Colombia.',
      );
      return;
    }
    this.formError.set('');
    this.range.set({ from, to });
  }
  block() {
    this.blockForm.markAllAsTouched();
    const r = this.store.resource(),
      c = this.context(),
      v = this.blockForm.getRawValue();
    if (this.blocked() || !r || !c || this.blockForm.invalid) return;
    const p = blockSchema.safeParse({
      startsAt: colombiaInstant(v.startsAt),
      endsAt: colombiaInstant(v.endsAt),
      reason: v.reason.trim(),
      expectedVersion: r.version,
    });
    if (!p.success) {
      this.formError.set(
        'Revisa el intervalo futuro y el motivo del bloqueo. Máximo 210 días.',
      );
      return;
    }
    this.formError.set('');
    this.store.execute({ kind: 'block', context: c, body: p.data });
  }
  release() {
    this.releaseForm.markAllAsTouched();
    const r = this.store.resource(),
      c = this.context(),
      v = this.releaseForm.getRawValue();
    if (
      this.blocked() ||
      !r ||
      !c ||
      this.releaseForm.invalid ||
      !this.store.blocks().some((b) => b.id === v.blockId)
    )
      return;
    const p = releaseSchema.safeParse({
      expectedVersion: r.version,
      reason: v.reason.trim(),
    });
    if (!p.success) return;
    this.formError.set('');
    this.store.execute({
      kind: 'release',
      context: c,
      blockId: v.blockId,
      body: p.data,
    });
  }
}
