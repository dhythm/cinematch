import { expect, test } from '@playwright/test'

test('作品を選んで調整ページを作り、回答して日程を決定できる', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/しねまっちゃん/)
  await expect(page.getByRole('link', { name: 'しねまっちゃん ホーム' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '公開予定の映画' })).toBeVisible()

  // カード全体（ポスター画像を含む）がリンクになっている
  await page.getByRole('link', { name: /凍てつく海のアストロノート/ }).click()
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

test('幹事以外は回答だけでき、幹事用URLを開いた端末は幹事になれる', async ({ page, browser }) => {
  // 幹事がイベントを作る
  await page.goto('/new?movie=levia')
  await page.getByRole('button', { name: /枠で調整ページをつくる/ }).click()
  await expect(page).toHaveURL(/\/e\/[\w-]+$/)
  const eventUrl = page.url()
  await expect(page.getByRole('heading', { name: /幹事用URL/ })).toBeVisible()
  const organizerUrl = (await page.getByText(/\/organizer\?key=/).textContent())?.match(/https?:\/\/\S+/)?.[0]

  // 別の端末（クッキーなし）の参加者: 回答はできるが、幹事の操作は出ない
  const guestContext = await browser.newContext()
  const guest = await guestContext.newPage()
  await guest.goto(eventUrl)
  await expect(guest.getByRole('heading', { name: /幹事用URL/ })).toHaveCount(0)
  await guest.getByLabel('名前', { exact: true }).fill('けんと')
  await guest.getByRole('button', { name: 'すべて行けるにする' }).click()
  await guest.getByRole('button', { name: '回答する' }).click()
  await expect(guest.getByText('いちばん集まりそうな回')).toBeVisible()
  await expect(guest.getByRole('button', { name: 'この回に決定する' })).toHaveCount(0)
  await expect(guest.getByText('イベントを編集')).toHaveCount(0)

  // 幹事用URLを開くと、その端末でも幹事になる（URL からキーは消える）
  await guest.goto(organizerUrl ?? '')
  await expect(guest).toHaveURL(eventUrl)
  await expect(guest.getByRole('button', { name: 'この回に決定する' })).toBeVisible()
  await guestContext.close()

  // 幹事は決定できる。参加者側では決定済みだけが見える
  await page.reload()
  await page.getByRole('button', { name: 'この回に決定する' }).click()
  await expect(page.getByRole('button', { name: '調整を再開' })).toBeVisible()

  const viewerContext = await browser.newContext()
  const viewer = await viewerContext.newPage()
  await viewer.goto(eventUrl)
  await expect(viewer.getByText('Decided')).toBeVisible()
  await expect(viewer.getByRole('button', { name: '調整を再開' })).toHaveCount(0)
  await expect(viewer.getByRole('button', { name: '予約済みにする' })).toHaveCount(0)
  await viewerContext.close()
})
