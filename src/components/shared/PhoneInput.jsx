import React from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneInput } from "@/components/utils/phoneFormatter";

export default function PhoneInput({ value, onChange, ...props }) {
  const handleChange = (e) => {
    const formatted = formatPhoneInput(e.target.value);
    onChange({ target: { value: formatted } });
  };

  return (
    <Input
      {...props}
      value={value || ''}
      onChange={handleChange}
      placeholder="555-555-5555"
      maxLength={12}
    />
  );
}