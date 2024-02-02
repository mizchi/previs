import React, { useState, FormEvent } from "react";

interface FormProps {
  onSubmit: (data: { [key: string]: any }) => void;
}

export default function Form({ onSubmit }: FormProps) {
  const [formData, setFormData] = useState<{ [key: string]: any }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Changed divs to flex flex-col for vertical alignment
  return (
    <form className="flex flex-col space-y-6" onSubmit={handleSubmit}>
      {/* First Name form field */}
      <div className="flex flex-col items-start">
        {" "}
        {/* Changed from flex items-center to flex flex-col items-start */}
        <label
          htmlFor="firstName"
          className="text-sm font-medium text-gray-700"
        >
          First Name {/* Removed block class for label */}
        </label>
        <input
          type="text"
          name="firstName"
          id="firstName"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={handleChange}
        />
      </div>
      {/* Family Name form field */}
      <div className="flex flex-col items-start">
        {" "}
        {/* Changed from flex items-center to flex flex-col items-start */}
        <label
          htmlFor="familyName"
          className="text-sm font-medium text-gray-700"
        >
          Family Name {/* Removed block class for label */}
        </label>
        <input
          type="text"
          name="familyName"
          id="familyName"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={handleChange}
        />
      </div>
      {/* Age form field */}
      <div className="flex flex-col items-start">
        {" "}
        {/* Changed from flex items-center to flex flex-col items-start */}
        <label htmlFor="age" className="text-sm font-medium text-gray-700">
          Age {/* Removed block class for label */}
        </label>
        <input
          type="number"
          name="age"
          id="age"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={handleChange}
        />
      </div>
      {/* Email form field */}
      <div className="flex flex-col items-start">
        {" "}
        {/* Changed from flex items-center to flex flex-col items-start */}
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email {/* Removed block class for label */}
        </label>
        <input
          type="email"
          name="email"
          id="email"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={handleChange}
        />
      </div>
      {/* Changed div to align items to the end and to make it a column */}
      <div className="self-end mt-6">
        {" "}
        {/* Edited to align the button to the bottom-right of the form */}
        <button
          type="submit"
          className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export function __PREVIEW__() {
  const handleSubmit = (formData: { [key: string]: any }) => {
    console.log(formData);
  };

  return <Form onSubmit={handleSubmit} />;
}
