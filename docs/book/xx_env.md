## 実行コンテキストの設計

サンプルを提示しない Zero Shot や Few Shotで生成できるのは、 基本的に GitHub にある知識のみです。それ以外の情報を渡すには、精度を上げるためにコンテキストを絞ってあげる必要があります。

AIによるコード生成は、基本的にスコープを絞れば絞るほど

プロンプトとして渡すには、実装とは別の型定義情報だけ絞って教えてあげるのが、トークンの効率がいいです。今現在の gpt-4 では、プロジェクト全体を入力とするには効率が悪すぎます。なので特定のコンテキストの型定義+コメントの情報を生成して、それを入力に取るのが現実的です。

例を出します。

```ts
// env.d.ts

// ファイルに書き込む
export declare function read(filepath: string): Promise<string | null>;

// ファイルを読み込む
export declare function write(filepath: string, content: string): Promise<void>;

// ファイルを削除
export declare function remove(filepath: string): Promise<void>;

// ファイルを列挙
export declare function list(): Promise<string[]>;

// ファイルを削除
export declare function clear(): Promise<void>;
```

プロンプト: これらの関数を使って、リクエストを満たすコードを生成してください。
リクエスト: {ユーザー入力}

アウトプットの例

```tsx
// リクエスト: README.md を読み込んで、そのファイルの長さを生成する stats.json を書き込むコード
import {read, write} from "./env";

const content = await read('./README.md');
await write('./stats.json', JSON.stringify({ length: Array.from(content).length }))
```

ライブラリを使う場合、そのAPIドキュメント(の要約)をプロンプトとして与えてあげるといいでしょう。有名なライブラリなら OpenAI は学習済みですが、マイナーなライブラリだとハルシネーションでAPIを捏造しようとするので、注意が必要です。

環境の提供は、基本的には Function Calling を自分で実装するイメージになります。

https://platform.openai.com/docs/guides/function-calling

Microsoft の TypeChat の実装も参考になります。

https://microsoft.github.io/TypeChat/

https://zenn.dev/mizchi/articles/typechat-code-generation
