import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UserDetailStore } from '../state/user-detail.store';
import { UserHeadingComponent } from '../components/user-heading.component';
import { validReason } from '../components/profile-editor.component';
import {
  globalRoles,
  membershipRoles,
  type GlobalRole,
  type MembershipRole,
  type OrganizationOption,
  type Membership,
} from '../models/user';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-user-access',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UserHeadingComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [UserDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-access.page.html',
})
export class UserAccessPage {
  readonly store = inject(UserDetailStore);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly userId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('userId') ?? '')),
    { initialValue: '' },
  );
  readonly roles = globalRoles;
  readonly membershipRoles = membershipRoles;
  readonly roleForm = this.fb.group({
    role: this.fb.control<GlobalRole>('user'),
    reason: ['', validReason],
  });
  readonly searchForm = this.fb.group({
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
  });
  readonly membershipForm = this.fb.group({
    role: this.fb.control<MembershipRole>('business_operator'),
    reason: ['', validReason],
  });
  readonly removalForm = this.fb.group({ reason: ['', validReason] });
  readonly selected = signal<OrganizationOption | null>(null);
  readonly removing = signal<Membership | null>(null);
  readonly eligible = computed(
    () =>
      this.store.user()?.status === 'active' &&
      !!this.store.user()?.emailVerifiedAt,
  );
  readonly allowedMembershipRoles = computed(() =>
    membershipRoles.filter((role) =>
      role.value.startsWith(
        this.selected()?.type === 'adoption_entity' ? 'adoption_' : 'business_',
      ),
    ),
  );
  constructor() {
    this.store.load(this.userId);
    effect(() => {
      this.userId();
      this.selected.set(null);
      this.removing.set(null);
      this.searchForm.reset({ search: '' });
      this.roleForm.controls.reason.reset('');
      this.membershipForm.reset({ role: 'business_operator', reason: '' });
      this.removalForm.reset({ reason: '' });
    });
    effect(() => {
      const user = this.store.user();
      if (user)
        this.roleForm.controls.role.setValue(user.globalRole, {
          emitEvent: false,
        });
    });
    effect(() => {
      const membership = this.removing();
      if (
        membership &&
        this.store.success() === 'Membresía retirada.' &&
        !this.store.loading() &&
        !this.store
          .access()
          ?.organizations.some(
            (item) => item.organizationId === membership.organizationId,
          )
      )
        this.removing.set(null);
    });
  }
  setRole() {
    this.roleForm.markAllAsTouched();
    if (this.roleForm.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#global-role-reason')
        ?.focus();
      return;
    }
    if (
      !this.roleForm.valid ||
      this.store.busy() ||
      !this.eligible() ||
      this.roleForm.controls.role.value === this.store.user()?.globalRole
    )
      return;
    this.store.execute({
      kind: 'role',
      userId: this.userId(),
      body: {
        role: this.roleForm.controls.role.value,
        reason: this.roleForm.controls.reason.value.trim(),
      },
    });
  }
  find(page = 1) {
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;
    this.store.findOrganizations({
      search: this.searchForm.controls.search.value.trim(),
      page,
    });
  }
  select(org: OrganizationOption) {
    this.selected.set(org);
    this.removing.set(null);
    const current = this.store
      .access()
      ?.organizations.find((m) => m.organizationId === org.id);
    this.membershipForm.controls.role.setValue(
      current?.role ??
        (org.type === 'business' ? 'business_operator' : 'adoption_operator'),
    );
    this.membershipForm.controls.reason.reset('');
  }
  assign() {
    const org = this.selected();
    this.membershipForm.markAllAsTouched();
    if (this.membershipForm.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#membership-reason')
        ?.focus();
      return;
    }
    if (
      !org ||
      !this.membershipForm.valid ||
      this.store.busy() ||
      !this.eligible()
    )
      return;
    this.store.execute({
      kind: 'membership',
      userId: this.userId(),
      organizationId: org.id,
      body: {
        role: this.membershipForm.controls.role.value,
        reason: this.membershipForm.controls.reason.value.trim(),
      },
    });
  }
  remove() {
    const membership = this.removing();
    this.removalForm.markAllAsTouched();
    if (this.removalForm.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#remove-membership-reason')
        ?.focus();
      return;
    }
    if (!membership || this.removalForm.invalid || this.store.busy()) return;
    this.store.execute({
      kind: 'remove-membership',
      userId: this.userId(),
      organizationId: membership.organizationId,
      body: { reason: this.removalForm.controls.reason.value.trim() },
    });
  }
  chooseRemoval(membership: Membership) {
    this.removing.set(membership);
    this.removalForm.reset({ reason: '' });
  }
  roleLabel(role: MembershipRole) {
    return membershipRoles.find((item) => item.value === role)?.label ?? role;
  }
}
