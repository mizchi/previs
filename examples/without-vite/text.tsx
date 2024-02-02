import React from "react";

export default function Text(props: { text: string }) {
  // Added icon before text label
  return (
    <span
      style={{
        fontWeight: "normal", // Adjusted font-weight to normal for a "classic theme"
        fontSize: "16px", // Adjusted font-size for classic theme
        color: "black", // Reverted text color to black for classic theme
        cursor: "pointer", // Retained cursor pointer to indicate the text is clickable
        fontFamily: "'Times New Roman', serif", // Changed to classic font-family "Times New Roman" for classic theme
        display: "flex", // Set to flex for inline icon and text
        alignItems: "center", // Vertically center the icon and text
      }}
      onClick={() => console.log("Text label clicked")} // Added a click event handler to log message on click
    >
      <i className="icon-class-name" style={{ marginRight: "8px" }}></i>{" "}
      {/* Added icon with margin right */}
      {props.text}
    </span>
  );
}

/*@__NO_SIDE_EFFECTS__*/
export function __PREVIEW__() {
  // The __PREVIEW__ now shows a clickable text label with an icon before the label and a "classic theme"
  return <Text text="Click me!" />;
}
