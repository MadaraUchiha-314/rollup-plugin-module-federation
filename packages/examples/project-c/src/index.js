import * as remote from 'project-b';

/* eslint-disable no-console */

export async function main() {
  const sharedScope = {
    react: {
      '18.0.0': {
        get: () => () => ({
          value: true,
        }),
      },
    },
  };
  console.log('Remote is: ', remote);
  await remote.init(sharedScope);
  const btn = await remote.get('./button');
  console.log('Button is: ', btn);
}

/* eslint-enable no-console */

await main();
