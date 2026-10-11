import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
const hintKey = 'pettly:backoffice:session-present';
@Injectable({ providedIn: 'root' })
export class SessionCoordination {
  private readonly window = isPlatformBrowser(inject(PLATFORM_ID))
    ? inject(DOCUMENT).defaultView
    : null;
  private channel: BroadcastChannel | null = null;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.channel?.close());
  }
  hasHint(): boolean {
    try {
      return this.window?.localStorage.getItem(hintKey) === '1';
    } catch {
      return true;
    } // Restricted storage: try the server cookie instead.
  }
  setHint(present: boolean) {
    try {
      if (present) this.window?.localStorage.setItem(hintKey, '1');
      else this.window?.localStorage.removeItem(hintKey);
    } catch {
      /* No tokens or personal data are stored. */
    }
  }
  serialize<T>(task: () => Promise<T>): Promise<T> {
    const locks = this.window?.navigator.locks;
    return locks ? locks.request('pettly:backoffice:refresh', task) : task();
  }
  listen(callback: (event: 'changed' | 'signed-out') => void) {
    if (!this.window || typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel('pettly:backoffice:session');
    this.channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === 'changed' || event.data === 'signed-out')
        callback(event.data);
    };
  }
  announce(event: 'changed' | 'signed-out') {
    this.channel?.postMessage(event);
  }
}
