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

  await page.getByLabel('劇場').fill('TOHOシネマズ新宿')
  await page.getByLabel('上映開始').fill('18:30')
  await page.getByRole('button', { name: '予約済みにする' }).click()
  await expect(page.getByRole('heading', { name: 'TOHOシネマズ新宿 18:30' })).toBeVisible()

  // DB に保存されているので、再読み込みしても決定・予約が残る
  await page.reload()
  await expect(page.getByRole('button', { name: '調整を再開' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'TOHOシネマズ新宿 18:30' })).toBeVisible()

  await page.goto('/')
  await expect(page.locator('#my-events').getByText('決定')).toBeVisible()
})

test('存在しないイベントは 404', async ({ page }) => {
  const response = await page.goto('/e/does-not-exist')
  expect(response?.status()).toBe(404)
})

test('回答の削除、イベントの編集・削除ができる', async ({ page }) => {
  await page.goto('/new?movie=amayo')
  await page.getByRole('button', { name: /枠で調整ページをつくる/ }).click()
  await expect(page).toHaveURL(/\/e\/[\w-]+$/)
  const eventUrl = page.url()

  await page.getByLabel('名前', { exact: true }).fill('けんと')
  await page.getByRole('button', { name: '回答する' }).click()
  await page.getByRole('button', { name: 'けんとさんの回答を編集' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '回答を削除' }).click()
  await expect(page.getByText('まだ回答がありません')).toBeVisible()

  await page.getByText('イベントを編集').click()
  await page.getByLabel('イベント名').fill('改題した会')
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('改題した会').first()).toBeVisible()

  await page.getByText('イベントを編集').click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'イベントを削除' }).click()
  await expect(page).toHaveURL('/')

  const response = await page.goto(eventUrl)
  expect(response?.status()).toBe(404)
})
