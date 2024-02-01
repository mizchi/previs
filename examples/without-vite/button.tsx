export default function Button() {
  // ボタンの背景色を青に変更
  const buttonStyle = {
    backgroundColor: 'blue',
    color: 'white',
  };
  return <button type="button" style={buttonStyle}>Click me</button>
}