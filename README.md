# しねまっちゃん

公開予定の映画を選び、公開日から 1〜2 週間の候補日で「いつ観に行くか」を仲間内で調整・決定する日程調整アプリ。

## セットアップ

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL（Docker）や映画 API のキー
pnpm db:up                   # Docker で PostgreSQL 17 を起動
pnpm dev                     # http://localhost:3000 （/e/demo にデモイベント）
```

開発時は起動時にマイグレーションが自動適用される。

## アーキテクチャ

```
Browser ── TanStack Query ──▶ app/api/* (Route Handlers) ──▶ server/* ──▶ Drizzle ORM ──▶ PostgreSQL
   ▲                                                            │
   └── Server Component で prefetch → HydrationBoundary ◀───────┘        MovieCatalog ──▶ movies テーブル / TMDB / 映画.com ICS
```

- **集計・検証・候補生成はすべてサーバー側**。クライアントはサーバーが返す集計済みの `EventView`（`tallies` / `best`）を表示するだけ。
- 変更系 mutation はレスポンスの `EventView` で TanStack Query のキャッシュを置き換える（クライアントで再計算しない）。
- ページ初期表示は Server Component が `server/container` から直接取得し、同じクエリキーで hydrate する。

| ディレクトリ | 役割 |
| --- | --- |
| `app/api/` | Route Handlers。zod で入力検証し、`server/` のサービスを呼ぶだけ |
| `server/domain/` | 純粋関数のドメインロジック（候補生成・集計・調整期間）とドメイン例外 |
| `server/events/` | `EventService`（ユースケース）と `EventRepository`（Drizzle 実装 + 契約テスト） |
| `server/db/` | Drizzle スキーマと DB 接続（`DATABASE_URL` → node-postgres / 未設定 → プロセス内 PGlite） |
| `drizzle/` | drizzle-kit が生成するマイグレーション SQL |
| `server/movies/` | `MovieCatalog`（TTL キャッシュ付き集約）と各プロバイダ（DB の movies テーブル / TMDB / 映画.com ICS） |
| `server/container.ts` | 環境変数から依存を組み立て、`globalThis` に保持（HMR をまたいで DB 接続やキャッシュを維持） |
| `lib/api/` | fetch クライアント、クエリキー、`queryOptions` / mutation hooks |
| `components/` | UI（shadcn/ui ベース） |

### データソースと保存先（環境変数）

| 変数 | 説明 |
| --- | --- |
| `TMDB_API_TOKEN` | 設定すると TMDB discover API（region=JP）から取得 |
| `EIGA_ICS_URL` | 設定すると映画.com の iCalendar から取得 |
| `SEED=false` | 開発時の起動時シードを止める |
| `DATABASE_URL` | PostgreSQL の接続先。未設定ならプロセス内 PGlite |
| `PGLITE_DATA_DIR` | `DATABASE_URL` 未設定時の PGlite 保存先。未指定ならメモリ |

### API

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/movies` | 調整できる作品（DB のシード映画 + 外部ソース） |
| GET / POST | `/api/events` | サマリー取得（`?ids=a,b`）/ イベント作成 |
| GET / PATCH / DELETE | `/api/events/:id` | 取得 / イベント情報の更新 / 削除 |
| POST | `/api/events/:id/participants` | 回答の追加（`id` 指定で更新） |
| DELETE | `/api/events/:id/participants/:participantId` | 回答の削除 |
| PUT / DELETE | `/api/events/:id/decision` | 日程の決定 / 調整の再開（予約も解除） |
| PUT / DELETE | `/api/events/:id/reservation` | 決定した回の予約（劇場・上映開始・メモ・予約者）の記録 / 取り消し |

変更系はすべて集計済みの `EventView` を返す。決定後は回答の追加・削除はできず（409）、予約中は別の回に変更できない（409）。

### データベース（Drizzle ORM）

アプリは常に Drizzle + node-postgres で `DATABASE_URL` に接続する。環境ごとに接続先だけが変わる。

| 環境 | DB | 起動 |
| --- | --- | --- |
| ローカル開発 | Docker の PostgreSQL 17（`compose.yaml`） | `pnpm db:up` → `pnpm dev` |
| コーディングエージェント / Docker のない環境 | PGlite サーバー（`.pglite` に永続化、PostgreSQL 互換のワイヤプロトコル） | `pnpm dev:pglite` |
| 開発・本番デプロイ | Neon などのホスティング PostgreSQL | `DATABASE_URL` を設定し、デプロイ時に `pnpm db:migrate` |
| テスト | プロセス内 PGlite（メモリ） | 設定不要 |

- `pnpm dev:pglite` は PGlite サーバー（127.0.0.1:5433）を起動し、その `DATABASE_URL` を渡して `next dev` を起動する。`.env.local` の値より優先される。
- PGlite サーバーは複数接続に対応しているので、dev サーバー稼働中でも `pnpm db:query` / `psql` / `pnpm db:studio` で中身を見られる。
- `drizzle-kit` と `pnpm db:query` は `DATABASE_URL` 未設定なら PGlite サーバーに接続する。
- 本番（`NODE_ENV=production`）では起動時の自動マイグレーションをしないので、デプロイ手順で `pnpm db:migrate` を実行する。
- シードデータ（`server/db/seed.ts`）: ダミー映画 6 本（公開日は実行日からの相対日）とデモイベント `/e/demo`。開発時は起動のたびに冪等に投入され、映画の公開日は今日基準に更新される。他の環境には `pnpm db:seed` で入れる。
- スキーマ変更: `server/db/schema.ts` を編集 → `pnpm db:generate` → 生成された `drizzle/*.sql` をコミット。

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm lint` / `pnpm lint:fix` | Biome（lint + format + import 整列） |
| `pnpm format` | Biome フォーマット |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm knip` | 未使用ファイル・export・依存の検出 |
| `pnpm test` | Vitest（`server` = node / `ui` = jsdom の 2 プロジェクト） |
| `pnpm e2e` | Playwright（使い捨てのインメモリ PGlite サーバー + シードデータで dev サーバーを起動） |
| `pnpm check` | lint + typecheck + knip + test |
| `pnpm browser <cmd>` | agent-browser（エージェント向けブラウザ操作 CLI） |
| `pnpm dev:pglite` | PGlite サーバー + dev サーバー（エージェント向け） |
| `pnpm db:up` / `pnpm db:down` | Docker の PostgreSQL を起動 / 停止 |
| `pnpm db:pglite` | PGlite サーバーだけを起動 |
| `pnpm db:generate` | スキーマからマイグレーション SQL を生成 |
| `pnpm db:migrate` | マイグレーションを適用 |
| `pnpm db:seed [--reset]` | ダミー映画とデモイベントを投入（`--reset` で全削除してから） |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:query "<SQL>"` | SQL を実行して結果を表示 |

### エージェントによる動作確認

```bash
# 1. PGlite に永続化する dev サーバー（Docker 不要）
pnpm dev:pglite

# 2. agent-browser で操作・確認
pnpm browser open http://localhost:3000/e/demo
pnpm browser snapshot -i          # アクセシビリティツリー（ref 付き）
pnpm browser click @e12
pnpm browser screenshot out.png

# 3. 稼働中のまま DB の中身を確認（データは .pglite に残り、再起動後も使える）
pnpm db:query "select id, title from events"
```

- `next dev` は同一ディレクトリで 1 つしか起動できないため、`pnpm e2e` 実行前に手元の dev サーバーを止める。E2E は使い捨てのインメモリ PGlite サーバーで動く。
- PGlite のデータを消すには、サーバーを止めて `.pglite/` を削除する。
- `pnpm dev:pglite` を止めるときは PGlite サーバーのプロセスを終了する（子の `next dev` も一緒に止まる）。
- agent-browser が Chrome を見つけられない場合は `AGENT_BROWSER_EXECUTABLE_PATH` を指定する。
- agent-browser の `fill` / `keyboard type` は `<input type="time">` などに値が入らない。`pnpm browser eval` でネイティブの value setter + `input` イベントを使う。
- プロキシ環境で `next/font` の取得に失敗する場合は `NODE_USE_ENV_PROXY=1` を付ける（Claude Code on the web では SessionStart フックが設定）。
