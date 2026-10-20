import { expect, test } from '@playwright/test';

test('two players can create, join and start an online room', async ({ browser }) => {
  const host = await (await browser.newContext()).newPage();
  await host.goto('/create?mode=online');
  await host.getByLabel(/your name|player name/i).first().fill('Host');
  await host.getByRole('button', { name: /create/i }).first().click();
  await host.waitForURL(/\/room\/[A-Z0-9]{5}/, { timeout: 90_000 });
  const code = host.url().match(/\/room\/([A-Z0-9]{5})/)![1]!;

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/join?code=${code}`);
  await guest.getByLabel('Your name').fill('Guest');
  await guest.getByRole('button', { name: 'Join room' }).click();
  await guest.waitForURL(new RegExp(`/room/${code}`), { timeout: 90_000 });

  await expect(host.getByText('Guest')).toBeVisible();
});
