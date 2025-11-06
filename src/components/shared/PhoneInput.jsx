import React from "react";
import { Input } from "@/components/ui/input";

export default function PhoneInput({ value, onChange, ...props }) {
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)})${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    onChange({ target: { value: formatted } });
  };

  return (
    <Input
      {...props}
      value={value || ''}
      onChange={handleChange}
      placeholder="(000)000-0000"
      maxLength={13}
    />
  );
}