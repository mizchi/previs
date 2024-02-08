import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

// Added getRandomBgColor function to randomly select a background color from a predefined list
const getRandomBgColor = () => {
  const colors = [
    "bg-blue-500",
    "bg-red-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = "button",
  className,
}) => {
  // Applying the getRandomBgColor function for the background color dynamically
  const bgColor = getRandomBgColor();

  return (
    <button
      type={type}
      className={`${bgColor} px-4 py-2 text-white rounded hover:bg-blue-700 ${
        className ?? ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;

export function __PREVIEW__() {
  return (
    <Button
      label="Sample Button"
      onClick={() => console.log("Preview Button Clicked")}
      type="button"
    />
  );
}
