import { mount } from './host';

mount('flow', () => new Worker(new URL('./flow.worker.ts', import.meta.url), { type: 'module' }));
