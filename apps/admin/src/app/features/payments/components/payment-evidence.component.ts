import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import {
  outcomeLabels,
  distributionLabels,
  type Payment,
  type FinancialEvidence,
} from '../models/payment';
import {
  moneyLabel,
  colombiaDateTime,
} from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-payment-evidence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-evidence.component.html',
})
export class PaymentEvidenceComponent {
  readonly evidence = input.required<FinancialEvidence>();
  readonly payment = input.required<Payment>();
  readonly money = moneyLabel;
  readonly date = colombiaDateTime;
  readonly outcomes = outcomeLabels;
  readonly distributions = distributionLabels;
}
