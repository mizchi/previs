export default function Button() {
  // Added styles for an outline with the color blue-200, and on hover, the outline becomes blue-800
  return (
    <button
      type="button"
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow outline outline-2 outline-blue-200 hover:outline-blue-800 hover:bg-blue-700 transition duration-300"
    >
      button
    </button>
  );
}
