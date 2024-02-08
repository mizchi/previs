import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = "button",
  className,
}) => {
  return (
    <button
      type={type}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 ${
        className || ""
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
    <Button label="Click me" onClick={() => console.log("Button clicked!")} />
  );
}
