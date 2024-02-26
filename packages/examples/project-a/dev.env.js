export const SERVER_PROTOCOL = 'http';
export const SERVER_BASE_URL = 'localhost';
export const SERVER_PORT = '8080';
export const SERVER_URL = `${SERVER_PROTOCOL}://${SERVER_BASE_URL}:${SERVER_PORT}`;

export const PATH_TO_REMOTE_ENTRY = 'dist/rollup/esm';
export const REMOTE_ENTRY_NAME = 'my-remote-entry.js';

export const PROJECT_A = 'project-a';
export const PROJECT_B = 'project-b';

export const PROJECT_A_PATH = `${SERVER_URL}/packages/examples/${PROJECT_A}/${PATH_TO_REMOTE_ENTRY}`;
export const PROJECT_B_PATH = `${SERVER_URL}/packages/examples/${PROJECT_A}/${PATH_TO_REMOTE_ENTRY}`;
