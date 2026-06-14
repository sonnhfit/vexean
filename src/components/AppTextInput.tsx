import { forwardRef, useState } from 'react';
import {
  TextInput as NativeTextInput,
  TextInputProps,
  TextInput as TextInputRef,
} from 'react-native';

export const AppTextInput = forwardRef<TextInputRef, TextInputProps>(
  ({ onBlur, onFocus, placeholder, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <NativeTextInput
        ref={ref}
        {...props}
        placeholder={focused ? '' : placeholder}
        onFocus={event => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
    );
  },
);
