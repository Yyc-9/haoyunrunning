import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-apple-gray-900">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`
          apple-input w-full text-sm
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
        `}
      />
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {hint && !error && (
        <p className="text-sm text-apple-gray-500">{hint}</p>
      )}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-apple-gray-900">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`
          apple-input w-full text-sm
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
        `}
      />
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {hint && !error && (
        <p className="text-sm text-apple-gray-500">{hint}</p>
      )}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, error, hint, options, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-apple-gray-900">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`
          apple-input w-full text-sm
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
        `}
      >
        <option value="">請選擇</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {hint && !error && (
        <p className="text-sm text-apple-gray-500">{hint}</p>
      )}
    </div>
  )
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-apple-gray-300 text-apple-blue focus:ring-apple-blue"
      />
      {label && <span className="text-sm text-apple-gray-900">{label}</span>}
    </label>
  )
}

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Radio({ label, ...props }: RadioProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        {...props}
        className="h-4 w-4 border-apple-gray-300 text-apple-blue focus:ring-apple-blue"
      />
      {label && <span className="text-sm text-apple-gray-900">{label}</span>}
    </label>
  )
}
