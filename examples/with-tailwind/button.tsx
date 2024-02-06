export default function Button() {
  // Changed button color to black (bg-black) and hover color to grey (hover:bg-gray-700)
  return (
    <button
      type="button"
      className="bg-black text-white font-semibold py-2 px-4 rounded shadow hover:bg-gray-700 transition duration-300"
    >
      button
    </button>
  );
}
