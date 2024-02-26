// @ts-check
import { test } from '@playwright/test';
import { PROJECT_A_PATH } from '../dev.env.js';

test('Load remote entry, init and get exposed modules from it', async ({
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
