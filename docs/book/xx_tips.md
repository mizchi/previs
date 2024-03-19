## AIによるコード生成のコツ

OpenAI は学習ソースの一つとして GitHub のコードを学習しています。

静的型付け言語では型定義や型への命名も一種のプロンプトとして機能します。これがあるので JS より TS の方がAIによるコード生成では有利です。

OpenAI を使ってコードを生成する場合、 GiｔHub のどこかに存在するコードを引っ張り出すイメージを持つとコードを生成しやすいです。

命名が曖昧な場合や嘘になってしまっていると、AI による支援能力が著しく低下します。AI による補助輪を活用したい場合、良い命名を常に心がける必要があります。

例えば、Svelte のコードを生成したいのに、 React のコードが生成されたり、 Tailwind を前提としたコードが生成されやすいです。

これに関してはプロンプトで念押ししておくと

```
あなたが生成するのは Svelte のコードです。 className="..." ではなく class="..." で記述してください。
Tailwind ではなく、 CSS Module を生成してください

```

また、フレームワーク違いのバイアスに引きずられた場合、単純なシンタックスエラーが発生しやすいです。

```
// Svelte のコードを生成してほしいのに、React のコードに引きずられているケース
NG: <button onClick={onClick}>click</button>
OK: <button on:click={onClick}>click</button>

```

生成したコードに簡単な lint なり format を掛けると検知できます。

```tsx
// Output Example
export function Button() {
  return <button className="bg-red-500">click</button>;
}

```

