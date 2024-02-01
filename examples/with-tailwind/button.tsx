export default function Button() {
  // Changed the button content from 'Click me' to 'button'
  return (
    <button
      type="button"
      className="bg-black text-white font-semibold py-2 px-4 rounded shadow hover:bg-red-700 transition-colors duration-300"
    >
      button
    </button>
  );
}