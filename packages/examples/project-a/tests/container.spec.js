// @ts-check
import { test } from '@playwright/test';
import { PROJECT_A_PATH, REMOTE_ENTRY_NAME } from '../dev.env.js';

test('Load remote entry, execute init and get exposed modules from it', async ({
  page,
}) => {
  await page.goto(PROJECT_A_PATH);
  /**
   * Load the remote entry
   */
  const remoteEntryProjectANetworkRequest = page.waitForResponse(
    '**/project-a/**/my-remote-entry.js',
  );
  await page.getByTestId('load-remote-a').click();
  await remoteEntryProjectANetworkRequest;
  /**
   * init the container
   */
  await page.getByTestId('init-remote-a').click();
  await page.getByTestId('load-exposed-react').click();
  const remoteEntryProjectBNetworkRequest = page.waitForResponse(
    '**/project-b/**/my-remote-entry.js',
  );
  await page.getByTestId('load-exposed-index').click();
  await remoteEntryProjectBNetworkRequest;
  await page.getByTestId('execute-doSomething-index').click();
  await page.getByTestId('load-exposed-pqr').click();
});

test('Load remotry entry, execute init and get exposed modules from it programatically', async ({
  page,
}) => {
  await page.goto(PROJECT_A_PATH);
  await page.evaluate(
    // eslint-disable-next-line no-shadow
    async ({ PROJECT_A_PATH, REMOTE_ENTRY_NAME }) => {
      function assert(condition, message) {
        if (!condition) {
          throw new Error(message);
        }
      }
      const container = await import(`${PROJECT_A_PATH}/${REMOTE_ENTRY_NAME}`);
      await container.init({});
      assert(
        globalThis.__FEDERATION__,
        'globalThis.__FEDERATION__ not defined!',
      );
      assert(
        globalThis.__FEDERATION__.__INSTANCES__.length === 1,
        'No instances are registered with __FEDERATION__',
      );
      assert(
        globalThis.__FEDERATION__.__INSTANCES__[0].name === 'sample_project_a',
        'sample_project_a not registered with __FEDERATION__',
      );

      const React = (await container.get('./react'))();
      assert(React.version === '18.2.0', 'Got incorrect version of react!');

      const index = (await container.get('./index'))();
      assert(
        Object.prototype.hasOwnProperty.call(index, 'doSomething'),
        'doSomething not exported by ./index of sample_project_a',
      );
      assert(
        Object.prototype.hasOwnProperty.call(index, 'createStore'),
        'createStore not exported by ./index of sample_project_a',
      );
      assert(
        Object.prototype.hasOwnProperty.call(index, 'compose'),
        'compose not exported by ./index of sample_project_a',
      );
      assert(
        Object.prototype.hasOwnProperty.call(index, 'kindlyApplyMiddleware'),
        'kindlyApplyMiddleware not exported by ./index of sample_project_a',
      );

      const doSomethingResult = await index.doSomething();
      assert(
        doSomethingResult.PQR === 'my string PQR',
        'Incorrect string value for PQR',
      );
      assert(
        doSomethingResult.ABC === 'my string abc',
        'Incorrect string value for ABC',
      );
      assert(
        Object.prototype.hasOwnProperty.call(doSomethingResult, 'Button'),
        'Button not exported from sample_project_b',
      );
      assert(
        Object.prototype.hasOwnProperty.call(
          doSomethingResult,
          'someThingElse',
        ),
        'someThingElse not exported by ./button of sample_project_b',
      );

      const someThingElseResult = doSomethingResult.someThingElse();
      assert(
        someThingElseResult.React.version === '18.2.0',
        'Got incorrect version of react!',
      );
      assert(
        someThingElseResult.something === 'nothing',
        'Something is not "nothing"!',
      );
      assert(
        Object.prototype.hasOwnProperty.call(someThingElseResult, 'axios'),
        'return value of someThingElse() didnt contain key axios',
      );
    },
    {
      PROJECT_A_PATH,
      REMOTE_ENTRY_NAME,
    },
  );
});
