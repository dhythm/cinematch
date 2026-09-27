# しねまっち

公開予定の映画を選び、公開日から 1〜2 週間の候補日で「いつ観に行くか」を仲間内で調整・決定する日程調整アプリ。

## セットアップ

```bash
pnpm install
cp .env.example .env.local   # 任意。未設定なら fixture データで動く
pnpm dev                     # http://localhost:3000 （/e/demo にデモイベント）
```

## アーキテクチャ

```
Browser ── TanStack Query ──▶ app/api/* (Route Handlers) ──▶ server/* ──▶ Repository (in-memory | PGlite)
   ▲                                                            │
   └── Server Component で prefetch → HydrationBoundary ◀───────┘        MovieCatalog ──▶ TMDB / 映画.com ICS / fixture
```

- **集計・検証・候補生成はすべてサーバー側**。クライアントはサーバーが返す集計済みの `EventView`（`tallies` / `best`）を表示するだけ。
- 変更系 mutation はレスポンスの `EventView` で TanStack Query のキャッシュを置き換える（クライアントで再計算しない）。
- ページ初期表示は Server Component が `server/container` から直接取得し、同じクエリキーで hydrate する。

| ディレクトリ | 役割 |
| --- | --- |
| `app/api/` | Route Handlers。zod で入力検証し、`server/` のサービスを呼ぶだけ |
| `server/domain/` | 純粋関数のドメインロジック（候補生成・集計・調整期間）とドメイン例外 |
| `server/events/` | `EventService`（ユースケース）と `EventRepository`（in-memory / PGlite 実装 + 共通契約テスト） |
| `server/movies/` | `MovieCatalog`（TTL キャッシュ付き集約）と各プロバイダ（TMDB / 映画.com ICS / fixture） |
| `server/container.ts` | 環境変数から依存を組み立て、`globalThis` に保持（HMR をまたいでインメモリ状態を維持） |
| `lib/api/` | fetch クライアント、クエリキー、`queryOptions` / mutation hooks |
| `components/` | UI（shadcn/ui ベース） |

### データソースと保存先（環境変数）

| 変数 | 説明 |
| --- | --- |
| `TMDB_API_TOKEN` | 設定すると TMDB discover API（region=JP）から取得 |
| `EIGA_ICS_URL` | 設定すると映画.com の iCalendar から取得 |
| `MOVIE_SOURCE=fixture` | 外部 API を使わず fixture に固定（公開日は「今日」からの相対日） |
| `DATA_STORE` | `memory`（既定）/ `pglite` |
| `PGLITE_DATA_DIR` | `DATA_STORE=pglite` の保存先（例: `.pglite`）。未指定ならインメモリ |

DB を導入するときは `EventRepository` の実装を追加し、`event-repository.contract.ts` の契約テストを通せばよい。

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm lint` / `pnpm lint:fix` | Biome（lint + format + import 整列） |
| `pnpm format` | Biome フォーマット |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm knip` | 未使用ファイル・export・依存の検出 |
| `pnpm test` | Vitest（`server` = node / `ui` = jsdom の 2 プロジェクト） |
| `pnpm e2e` | Playwright（port 3100 で fixture + memory の dev サーバーを起動） |
| `pnpm check` | lint + typecheck + knip + test |
| `pnpm browser <cmd>` | agent-browser（エージェント向けブラウザ操作 CLI） |
| `pnpm db:pglite "<SQL>"` | PGlite に SQL を実行して結果を表示 |

### エージェントによる動作確認

```bash
# 1. PGlite に永続化する dev サーバー
DATA_STORE=pglite PGLITE_DATA_DIR=.pglite pnpm dev

# 2. agent-browser で操作・確認
pnpm browser open http://localhost:3000/e/demo
pnpm browser snapshot -i          # アクセシビリティツリー（ref 付き）
pnpm browser click @e12
pnpm browser screenshot out.png

# 3. dev サーバーを止めてから DB の中身を確認（PGlite は単一プロセス専用）
pnpm db:pglite "select id, title from events"
```

- `next dev` は同一ディレクトリで 1 つしか起動できないため、`pnpm e2e` 実行前に手元の dev サーバーを止める。
- agent-browser が Chrome を見つけられない場合は `AGENT_BROWSER_EXECUTABLE_PATH` を指定する。
- プロキシ環境で `next/font` の取得に失敗する場合は `NODE_USE_ENV_PROXY=1` を付ける（Claude Code on the web では SessionStart フックが設定）。
