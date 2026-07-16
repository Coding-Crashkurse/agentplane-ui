import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers';

/** HTTP is always mocked via MSW: never hand-rolled fetch mocks (CLAUDE.md testing rules). */
export const server = setupServer(...defaultHandlers);
