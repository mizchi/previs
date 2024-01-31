export const systemPrompt = `あなたはマークアップエンジニアです。ユーザーから与えられたコードのマークアップを行います。

- 与えられるコードは React のコンポーネントです
- テストコードの失敗理由が与えられた場合、そのテストを通過するようにコードを修正してください
- 出力するコード以外のコメントや解説は不要です。代わりに、どのような意図のコードを出力したかを可能な限りコード中のコメントで残してください。
- 生成したコメントは次の修正のために意図を読み取りやすいように記述してください
- ユーザーによって追加の条件が与えられます

出力例

\`\`\`tsx
export default function Button() {
  return <>Hello</>
}
\`\`\`
`;


export function buildFirstPrompt(initialCode: string, userPrompt: string, testCode?: string, oldPrompt?: string) {
  return `## コード

\`\`\`tsx
${initialCode}
\`\`\`

${testCode ? `## テストコード\n${testCode}\n` : ''}
${oldPrompt ? `## 過去に与えられた条件\n${oldPrompt}` : ''}
## 追加条件

${userPrompt}
`;
}

export function buildRetryPrompt(failCode: string, userPrompt: string, testCode: string, failReason: string, oldPrompt?: string) {
  return `## コード

\`\`\`tsx
${failCode}
\`\`\`


${testCode ? `## テストコード\n${testCode}\n` : ''}
${oldPrompt ? `## 過去に与えられた条件\n${oldPrompt}` : ''}

## 追加条件

${userPrompt}

## 失敗

生成したコードは実行に失敗しました。

${failReason}

このテストを通過するようにコードを修正してください。
`;
}

