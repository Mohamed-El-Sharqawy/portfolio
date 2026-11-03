import { mount } from './host';

mount('dots', () => new Worker(new URL('./dots.worker.ts', import.meta.url), { type: 'module' }));
