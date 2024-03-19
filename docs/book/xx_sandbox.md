# 検証サンドボックスの設計### スケルトンジェネレーター

AIによって生成されたコードの実行で一番怖いのは、学習元が何らかの形で汚染されていて、悪意あるコードを実行してしまうときです。

https://jpsec.ai/attack-to-hijack-ai/

これを防ぐために必要な措置として、生成されたコードは何らかのサンドボックスの中で実行するのが望ましいと考えています。

プログラマの補助ツールとして生成コードを。サービスの一部として End to End で生成コードをデプロイして運用するようなパターンの場合、サンドボックスの設計は必須要件です。

例えば、 deno permission や node の実験的な permissions の機能、または wasm sandbox が有用でしょう。

https://docs.deno.com/runtime/manual/basics/permissions https://nodejs.org/api/permissions.htmlhttps://webassembly.org/docs/security/

より厳密なサンドボックスが必要な場合、これらをコンテナ下で ingress/egress も制御した状態で実行する必要があります。が、それらをランタイムレベルで取り回せる deno はかなり取り回しがいい実行環境です。

なので自分は previs を deno で実装しました。

---

以下に入力例を示します。

## 入力: 1

整数をIEEE754にしたがってバイナリに変換するTypeScript のコードを書いてください

export function floatToIEEE754(a: number): Int32Array {/*impl*/};

## 出力: 1

整数をIEEE754形式でバイナリに変換するには、まず整数を浮動小数点数に変換し、その後その浮動小数点数をIEEE754形式でバイナリに変換する必要があります。以下のTypeScriptコードは、このプロセスを実装しています。

```
export function intToIEEE754Binary(a: number): Int32Array {
  const buffer = new ArrayBuffer(4); // 4バイトのバッファを作成
  const view = new DataView(buffer); // DataViewを使用してバッファを操作
  view.setFloat32(0, a, true); // 整数を浮動小数点数として設定し、リトルエンディアンで格納

  // Int32Arrayに変換して返す
  return new Int32Array(buffer);
}

```

### 入力:2

これに対するテストコードを vitest で実装してください

### 出力:2

```
import { describe, it, expect } from 'vitest';
import { intToIEEE754Binary } from './yourFunctionFile'; // 関数が定義されているファイルをインポート

describe('intToIEEE754Binary', () => {
  it('should convert an integer to its IEEE754 binary representation', () => {
    const testValue = 1; // テスト用の整数値
    const result = intToIEEE754Binary(testValue);

    // 浮動小数点数1のIEEE754形式のバイナリ表現を期待する
    // この表現は環境や実装によって異なる場合があるため、具体的な値は環境によります
    // ここでは仮の期待値を使用しています
    const expected = new Int32Array(new ArrayBuffer(4));
    const view = new DataView(expected.buffer);
    view.setFloat32(0, testValue, true); // 期待される値を設定

    // 結果が期待値と等しいか確認
    expect(result[0]).toBe(expected[0]);
  });
});

```

