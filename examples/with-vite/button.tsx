export default function Button() {
  // ボタンスタイルに赤い背景を設定
  const buttonStyle = {
    backgroundColor: 'red', // 背景色を赤に設定
    color: 'white', // テキストを白に設定して読みやすくしています
  };

  return <button type="button" style={buttonStyle}>Click me</button>
}