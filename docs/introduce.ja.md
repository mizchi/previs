zenn に投稿する記事の下書き

---

# previs: 面倒なマークアップは AI にやらせる

自分はフロントエンドのロジックを考えるのは得意なんですが、スタイルシート書くのはあまり得意ではないです。

なので 自分は AI にコード変更を依頼して実行結果を目視でプレビューしつつ、その結果を受けいれるかどうかの判断だけすればよくね？と考えて、それを CLIとして実装してみました。

![demo](https://cdn.deno.land/previs/versions/v0.1.1/raw/ss.png)

## 実装した背景

vscode ターミナル上で画像を表示できる

https://zenn.dev/hankei6km/articles/display-images-on-vscode-terminal


OpenAI API は`gpt-4-vision-preview` のモデルで画像をアップロードして認識させることができる

https://zenn.dev/mizchi/scraps/50afabbf5e552e

## previs の紹介

https://deno.land/x/previs@v0.1.1

vite プロジェクト上で `$ previs <filename>` で任意の React Component を含むファイルを指定すると、そのコンポーネント単体で実行する vite で実行する静的サイトをビルドします。

その静的ページを puppteer で表示し、スクリーンショットを取ります。

スクリーンショットを確認したユーザーは、そのコードをどのように変更したいかの入力を与えることができます。 previs はその結果を元に OpenAI API でコードの変更をリクエストします。

```bash
$ previs src/Button.tsx
Request> change background color red
```

コードが生成されたらそのレンダリング結果を再度スクリーンショットを撮影しつつ diff を表示します。ユーザーは、そのコードを受け入れるか、拒否するか、さらなる修正リクエストを送るかを選択し、納得いくまでコードの生成を繰り返すことができます。

```bash
$ previs src/Button.tsx
[preview]
Request> ...
[preview]

Accept? [y/N/<request>] more contrast
[preview]

Accept? [y/N/<request>] y
```

設計的には React 以外も対応しているんですが、自分は vite + tailwind の環境で使うことを意図しています。特に、小さなコンポーネントのマークアップを、目視で修正しつつインタラクティブで組み立てることを想定します。

## インストール

deno で実装したので、 deno 本体のインストールが必要です。

```bash
# install deno
$ curl -fsSL https://deno.land/x/install/install.sh | sh
# Install previs
$ deno install -Af https://deno.land/x/previs@0.1.2/previs.ts
# deno install したものを使うには、PATH に ~/.deno/bin が必要

$ previs -h
```

OpenAI を使うので、環境変数で `PREVIS_OPENAI_API_KEY` または `OPENAI_API_KEY` をセットして置く必要があります。これは自分で生成してください。(画像認識モデルを使いたい場合は有料プランに入っている必要があるかも)

https://help.openai.com/en/articles/4936850-where-do-i-find-my-api-key

そのプロジェクトで `previs` が実行可能かどうか、`previs doctor` で検査できます。

```bash
$ previs doctor   
✅ git
✅ code
✅ imgcat
✅ bat
✅ PREVIS_OPENAI_API_KEY is set
✅ vite: ./vite.config.mts
✅ .gitignore includes .previs*
✅ package.json: ./package.json
✅ tsconfig.json: ./tsconfig.json
✅ compilerOptions.jsx: react-jsx
Library: react
Base: ./
```

vscode terminal 上で画像を表示するために、imgcat のインストールと vscode の settings を足す必要があります。

### imgcat

iterm2 と vscode terminal の画像表示プロトコルに従って画像を表示する CLI ツール

```bash
# cd under PATH
$ wget https://iterm2.com/utilities/imgcat
$ chmod +x imgcat
```

### vscode: User Settings

vscode のコマンドパレットで `Preferences: Open User Settings (JSON)` で設定を開いて、次の設定を追記。

```jsonc
{
  // ...
  "terminal.integrated.enableImages": true,
}
```

### bat

なくても良いですがターミナル上でシンタックスハイライトができて便利

https://github.com/sharkdp/bat

(ない場合は cat にフォールバックしてます)

## How to use previs

```bash
# ヘルプを表示
$ previs -h

# 存在しないファイルを指定した場合、ファイルを生成する
$ previs Button.tsx
What is this file? ...
Accept? [y/N]

# ファイルが存在する場合は、レンダリングした上で追加の修正指示を入力する
$ previs Button.tsx

# --import でプレビュー環境で import するファイルを指定
$ previs src/Button.tsx --import src/index.css

# --import でプレビュー環境で import するファイルを指定
$ previs src/Button.tsx --import src/index.css
```

## プレビュー規約(React)

指定したファイルをどのように実行してスクリーンショットを取るかの規約があります。

指定されたファイルの export されたシンボルから次のものを解決して、vite でビルドします。

1. `__PREVIEW__`
  - 例: `export function __PREVIEW__(/* shoud be non-props component */) {}`
2. ファイル名と同名のシンボル
  - 例: `Button.tsx` => `export function Button() {...}`
3. `default`
  - 例: `export default function App() {...}`

一応、該当するファイルのエントリポイントらしきファイルが props を持つ場合、 `__PREVIEW__` コンポーネントを自動的に生成するようなプロンプトが入っています。

具体的には、次のようなコードが生成されることを想定します。

```tsx
export default function Text(props: { text: string}) {
  return <span>{props.text}</span>
}

export function __PREVIEW__() {
  return <>
    <Text text="hello" />
  </>
}
```

この `__PREVIEW__` はビルド時に未使用コードとして判断されるので消えます。

当然ですが、 `useContext()` や、他のファイルの実行を前提としているコンポーネントはそれ専用のセットアップが必要になります。

## レシピ

この手順で動くことを確認しています。

### with vite


```bash
$ npm create vite@latest
$ cd <proj>
$ pnpm install
# Run
$ previs src/Button.tsx
```

## with tailwind

```bash
$ npm create vite@latest
$ cd tw
$ pnpm install
$ npx tailwindcss init -p
$ pnpm add tailwindcss postcss autoprefixer -D
$ echo ".previs*" >> .gitignore
# Override src/index.css
$ echo "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" > src/index.css

# Run
$ previs src/Button.tsx -i src/index.css
```

## with vitest

テストコードを与えて自動で自己修正するパターン

```bash
# vite プロジェクト下
$ pnpm add vitest -D
```

In-Source testing を有効にします。

```tsx
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    "import.meta.vitest": JSON.stringify(false),
  },
  test: {
    includeSource: ['**/*.{ts,tsx}'],
  }
});
```

事前に Button.tsx のテストコードを書いておきます。

```ts
export function add(a: number, b: number) {
  return a + b;
}
if (import.meta.vitest) {
  const {test, expect} = import.meta.vitest;
  test("1+2=3", () => {
    expect(add(1, 2)).toBe(3);
  });
}
```

`--` でテストコードを渡すと、テストコードをパスするまでコード生成を繰り返します。
ただ繰り返すのではなく、失敗情報をプロンプトに含んで再生成しているので、修正する精度はそこそこ高いはず。

```bash
$ previs src/add.ts -- pnpm vitest --run __FILE__ # __FILE__ は一時的な生成ファイルに置換される
```

実際、 `--` 以降のテストコマンドの部分は vitest に限ったものではなく、任意のコマンドでステータスコードを返すものなら何でも構いません。ただ内部で vite を使ってるので、同じ設定で動く vitest が相性がよいと思っています。

In-Source Testing を使っている意図としては、同じファイルに書いてあるテストコードはそれ自体が一種のプロンプトとして機能するからです。

## TODO

今認識してる問題と機能追加

- `.previs*` や `*.__previs__.tsx` みたいなファイルが実行後のゴミとして残ることがある
- OpenAI API の出力をパースする処理が失敗することがある
- `-W`, `-H` でプレビューするサイズの計算がおかしい
- WebUI 版
- 外部ライブラリを利用したり、別コンポーネントの参照を許可するパターン
- preact
- svelte
- vue

## 内部実装の話

今回は deno で実装しました。 deno の node compatibility が上がって、今では vite が deno 上で動くようになっています。

これを利用して、一時的な vite プロジェクトを生成して、そのビルド結果を puppeteer で撮影しています。pupeteer も deno で動いているのが嬉しいですね。

これと typechat を解析したときに学んだプロンプトエンジニアリングの知識を使って、 CSS(というか tailwind の className) を生成するのに特化するツールを作ったわけです。

https://zenn.dev/mizchi/articles/typechat-code-generation

自分は AI によるコード生成に一番大事なのは、それが動作するサンドボックスの設計だと思っていて、何が生成されるかわからない以上、安全なサンドボックスで受け入れのためのテストを実行する必要があると考えています。仮に OpenAI が何らかの汚染された学習ソースを参照してしまっていた場合、それ経由で悪意あるコードをローカルで生成/実行してしまう可能性があるからです。

deno はパーミッションで細かく権限を制御できるので、サンドボックスを設計しやすいです。とはいえ、今回は `--allow-run` で外部プロセスを多用しているため、サンドボックスがちゃんと機能していないんですが...後で頑張る余地があるということで。

## おわり

是非使ってみて感想をください。機能リクエストがあれば Issue まで https://github.com/mizchi/previs/issues

これを作るに至る過程で、プロンプトエンジニアリングについて一家言あるんですが、それは別の記事で書く予定です。

今回は deno で全部作ったんですが、vscode + deno はかなり開発体験がよくなっていました。今後も小さいツールは deno で作っていこうと思います。
