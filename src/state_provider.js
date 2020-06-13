import { Stream } from './streams.js';

const state = {};

export { state as default };

export const eventStream = Stream();

export const errorStream = Stream();
