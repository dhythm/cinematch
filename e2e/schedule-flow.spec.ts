import { expect, test } from '@playwright/test'

test('作品を選んで調整ページを作り、回答して日程を決定できる', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '公開予定の映画' })).toBeVisible()

  await page
    .getByRole('article')
    .filter({ hasText: '凍てつく海のアストロノート' })
    .getByRole('link', { name: '日程を調整する' })
    .click()
  await expect(page).toHaveURL(/\/new\?movie=itetsuku/)

  await page.getByLabel('幹事の名前').fill('はるか')
  await page.getByRole('button', { name: /枠で調整ページをつくる/ }).click()
  await expect(page).toHaveURL(/\/e\/[\w-]+$/)
  await expect(page.getByText('まだ回答がありません')).toBeVisible()

  await page.getByLabel('名前', { exact: true }).fill('みお')
  await page.getByRole('button', { name: 'すべて行けるにする' }).click()
  await page.getByRole('button', { name: '回答する' }).click()
  await expect(page.getByRole('button', { name: 'みおさんの回答を編集' })).toBeVisible()

  await page.getByRole('button', { name: 'この回に決定する' }).click()
  await expect(page.getByRole('button', { name: '調整を再開' })).toBeVisible()

  // サーバー側に保存されているので、再読み込みしても決定状態が残る
  await page.reload()
  await expect(page.getByRole('button', { name: '調整を再開' })).toBeVisible()

  await page.goto('/')
  await expect(page.locator('#my-events').getByText('決定')).toBeVisible()
})

test('存在しないイベントは 404', async ({ page }) => {
  const response = await page.goto('/e/does-not-exist')
  expect(response?.status()).toBe(404)
})
