export default function Button() {
  // ユーザーの要望に基づいて、ボタンの背景色を青に変更
  const buttonStyle = {
    backgroundColor: 'blue', // 背景色を青に設定
    color: 'white', // テキストは白のままで、可読性を保つ
  };

  return <button type="button" style={buttonStyle}>Click me</button>
}