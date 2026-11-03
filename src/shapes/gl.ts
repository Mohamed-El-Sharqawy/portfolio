import { mount } from './host';

mount('gl', () => new Worker(new URL('./gl.worker.ts', import.meta.url), { type: 'module' }));
