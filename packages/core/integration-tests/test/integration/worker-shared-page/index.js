import './large';

new Worker(new URL('worker.js', import.meta.url), {type: 'module'});
