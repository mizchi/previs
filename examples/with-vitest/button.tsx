export default function Button() {
  // ユーザーの要望に応じてボタンの背景色を赤に変更
  const buttonStyle = {
    backgroundColor: 'red', // 背景色を赤に変更しユーザーの要望に沿った
    color: 'white', // テキスト色は白のまま、赤と白のコントラストを意図
  };

  return <button type="button" style={buttonStyle}>Click me</button>
}