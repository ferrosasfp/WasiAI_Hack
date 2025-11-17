"use client";
import React from 'react'
import { Autocomplete, TextField, type AutocompleteProps, type TextFieldProps } from '@mui/material'

export type SelectFieldProps<T, Multiple extends boolean | undefined = undefined, DisableClearable extends boolean | undefined = undefined, FreeSolo extends boolean | undefined = undefined> = {
  label?: string,
  placeholder?: string,
  helperText?: React.ReactNode,
  textFieldProps?: Partial<TextFieldProps>,
} & Omit<AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>, 'renderInput'>

export default function SelectField<T, Multiple extends boolean | undefined = undefined, DisableClearable extends boolean | undefined = undefined, FreeSolo extends boolean | undefined = undefined>(props: SelectFieldProps<T, Multiple, DisableClearable, FreeSolo>) {
  const { label, placeholder, helperText, textFieldProps, slotProps, renderTags, ...rest } = props as any
  return (
    <Autocomplete
      {...(rest as any)}
      slotProps={slotProps as any}
      renderTags={renderTags as any}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          {...(textFieldProps || {})}
        />
      )}
    />
  )
}
