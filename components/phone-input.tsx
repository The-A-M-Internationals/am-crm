"use client";
import React, { useState, useEffect } from "react";

const COUNTRY_CODES = [
  { code: "+971", country: "UAE" },
  { code: "+44", country: "UK" },
  { code: "+1", country: "US" },
  { code: "+91", country: "IND" },
];

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, className = "form-input", placeholder = "55 123 4567" }: PhoneInputProps) {
  let activeCode = "+971";
  let localNumber = value || "";

  if (value) {
    const matchedCode = COUNTRY_CODES.find(c => value.startsWith(c.code));
    if (matchedCode) {
      activeCode = matchedCode.code;
      localNumber = value.slice(activeCode.length);
    } else {
      const codeMatch = value.match(/^(\+\d{1,4})/);
      if (codeMatch) {
        activeCode = codeMatch[1];
        localNumber = value.slice(activeCode.length);
      } else if (value.startsWith("+")) {
        activeCode = "+";
        localNumber = value.slice(1);
      }
    }
  }

  const isPreset = COUNTRY_CODES.some(c => c.code === activeCode);
  const [isCustomMode, setIsCustomMode] = useState(!isPreset && value !== "");

  useEffect(() => {
    if (isPreset) setIsCustomMode(false);
    else if (value) setIsCustomMode(true);
  }, [value, isPreset]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "custom") {
      setIsCustomMode(true);
      onChange("+" + localNumber.replace(/[^\d\s-]/g, ""));
    } else {
      setIsCustomMode(false);
      onChange(e.target.value + localNumber.replace(/[^\d\s-]/g, ""));
    }
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newCode = e.target.value.replace(/[^\+\d]/g, "");
    if (!newCode.startsWith("+") && newCode.length > 0) newCode = "+" + newCode.replace(/\+/g, "");
    onChange(newCode + localNumber.replace(/[^\d\s-]/g, ""));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d\s-]/g, "");
    onChange(activeCode + cleaned);
  };

  return (
    <div className="flex">
      {!isCustomMode ? (
        <select 
          value={activeCode} 
          onChange={handleSelectChange}
          className="px-2 py-2 border rounded-l-lg bg-gray-50 text-sm outline-none border-r-0 text-gray-700"
          style={{ borderColor: "#e5e7eb", minWidth: "90px" }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.code} {c.country}</option>
          ))}
          <option value="custom">Other...</option>
        </select>
      ) : (
        <div className="relative flex items-center">
          <input 
            type="text"
            value={activeCode} 
            onChange={handleCustomCodeChange}
            className="px-2 py-2 border rounded-l-lg bg-gray-50 text-sm outline-none border-r-0 text-gray-700"
            style={{ borderColor: "#e5e7eb", width: "90px", minWidth: "90px" }}
            placeholder="+..."
            autoFocus
          />
          {activeCode === "+" && (
            <button 
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                onChange("+971" + localNumber);
              }}
              className="absolute right-1 text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
              style={{ fontSize: '10px' }}
            >
              ✕
            </button>
          )}
        </div>
      )}
      <input 
        type="tel" 
        value={localNumber}
        onChange={handleNumberChange}
        className={className + " rounded-l-none"}
        placeholder={placeholder}
      />
    </div>
  );
}
