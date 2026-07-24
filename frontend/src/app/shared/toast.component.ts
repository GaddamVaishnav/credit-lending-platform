import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;max-width:420px;min-width:300px">
      <div *ngFor="let t of toast.toasts()"
           (click)="toast.remove(t.id)"
           style="display:flex;align-items:flex-start;gap:0.75rem;padding:1rem 1.25rem;border-radius:0.75rem;box-shadow:0 8px 24px rgba(0,0,0,.15);cursor:pointer;font-family:sans-serif;font-size:0.875rem;animation:slideIn 0.3s ease"
           [style.background]="getBg(t.type)"
           [style.border]="getBorder(t.type)"
           [style.color]="getColor(t.type)">
        <span style="font-size:1.2rem;flex-shrink:0">{{ getIcon(t.type) }}</span>
        <span style="flex:1;line-height:1.5;font-weight:500">{{ t.message }}</span>
        <button (click)="toast.remove(t.id)"
                style="background:none;border:none;cursor:pointer;font-size:1rem;opacity:0.6;padding:0;line-height:1"
                (click)="$event.stopPropagation()">✕</button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `]
})
export class ToastComponent {
  constructor(public toast: ToastService) {}

  getBg(type: string) {
    const m: any = { success:'#f0fdf4', error:'#fef2f2', info:'#eff6ff', warning:'#fffbeb' };
    return m[type] || '#f9fafb';
  }
  getBorder(type: string) {
    const m: any = { success:'1px solid #86efac', error:'1px solid #fca5a5', info:'1px solid #93c5fd', warning:'1px solid #fcd34d' };
    return m[type] || '1px solid #e5e7eb';
  }
  getColor(type: string) {
    const m: any = { success:'#166534', error:'#991b1b', info:'#1e40af', warning:'#92400e' };
    return m[type] || '#374151';
  }
  getIcon(type: string) {
    const m: any = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    return m[type] || 'ℹ️';
  }
}
