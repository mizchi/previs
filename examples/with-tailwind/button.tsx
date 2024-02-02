export default function Button() {
  // Changed the background color to blue and the hover color to a darker blue
  return (
    <button
      type="button"
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-blue-700 transition-colors duration-300"
    >
      button
    </button>
  );
}
