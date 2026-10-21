import { ChangeDetectionStrategy, Component, input } from '@angular/core';
export type IconName =
  | 'paw'
  | 'arrow'
  | 'home'
  | 'person'
  | 'logout'
  | 'check'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'menu'
  | 'close'
  | 'users'
  | 'building'
  | 'heart';
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0 items-center justify-center',
    'aria-hidden': 'true',
  },
  template: `<svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    focusable="false"
  >
    @switch (name()) {
      @case ('paw') {
        <ellipse cx="5" cy="9" rx="2" ry="3" />
        <ellipse cx="10" cy="5" rx="2" ry="3" />
        <ellipse cx="16" cy="5" rx="2" ry="3" />
        <ellipse cx="21" cy="10" rx="2" ry="3" />
        <path d="M6 18c0-3 3-6 6-6s6 3 6 6c0 3-4 1-6 1s-6 2-6-1Z" />
      }
      @case ('arrow') {
        <path d="M5 12h14m-5-5 5 5-5 5" />
      }
      @case ('home') {
        <path d="m3 10 9-7 9 7v10H3Zm6 10v-7h6v7" />
      }
      @case ('person') {
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      }
      @case ('logout') {
        <path d="M9 4H4v16h5m4-8h8m-4-4 4 4-4 4" />
      }
      @case ('check') {
        <path d="m5 12 4 4L19 6" />
      }
      @case ('lock') {
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      }
      @case ('eye') {
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      }
      @case ('eye-off') {
        <path
          d="m3 3 18 18M10 5h2c6 0 10 7 10 7a20 20 0 0 1-3 4M6 6a20 20 0 0 0-4 6s4 7 10 7a13 13 0 0 0 5-1M10 10a3 3 0 0 0 4 4"
        />
      }
      @case ('menu') {
        <path d="M4 6h16M4 12h16M4 18h16" />
      }
      @case ('close') {
        <path d="m6 6 12 12M6 18 18 6" />
      }
      @case ('users') {
        <circle cx="9" cy="8" r="3" />
        <path
          d="M2 21v-3a7 7 0 0 1 14 0v3m0-17a3 3 0 0 1 0 6m3 5a6 6 0 0 1 3 6"
        />
      }
      @case ('building') {
        <path d="M4 21V3h12v18m0-12h4v12M2 21h20M8 7h4m-4 4h4m-4 4h4" />
      }
      @case ('heart') {
        <path
          d="M20 4a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 16 8 16s13-11 8-16Z"
        />
      }
    }
  </svg>`,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
