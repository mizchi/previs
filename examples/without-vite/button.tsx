export default function Button({ onClick }) {
  // Added onClick prop to allow button click handling
  const buttonStyle = {
    backgroundColor: 'red', 
    color: 'white',
  };
  return <button type="button" style={buttonStyle} onClick={onClick}>Click me</button>
}