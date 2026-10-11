import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import {
  statusLabel,
  distributionLabels,
  type Payment,
} from '../models/payment';
import {
  moneyLabel,
  colombiaDateTime,
} from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-payment-snapshot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-snapshot.component.html',
})
export class PaymentSnapshotComponent {
  readonly payment = input.required<Payment>();
  readonly money = moneyLabel;
  readonly date = colombiaDateTime;
  readonly statusLabel = statusLabel;
  readonly distributionLabels = distributionLabels;
}
