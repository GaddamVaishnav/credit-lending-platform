import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  success(message: string) { this.add(message, 'success'); }
  error(message: string)   { this.add(message, 'error', 6000); }
  info(message: string)    { this.add(message, 'info'); }
  warning(message: string) { this.add(message, 'warning'); }

  private add(message: string, type: Toast['type'], duration = 4000) {
    const id = ++this.counter;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
