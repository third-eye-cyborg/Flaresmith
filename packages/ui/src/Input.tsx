import React from "react";
import { TextInput, type TextInputProps } from "react-native";

export interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error, ...props }: InputProps) {
  return (
    <TextInput
      className={`border rounded-lg px-4 py-2 ${
        error ? "border-error-500" : "border-gray-300"
      } focus:border-primary-500`}
      {...props}
    />
  );
}
