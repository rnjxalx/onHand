import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, radius, fontFamily, fontSize } from '../theme';

interface TextFieldProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

/**
 * TextField — 로그인/회원가입 입력 필드
 * Figma: 흰 배경 + 미세 그림자, placeholder 회색
 */
export function TextField({ containerStyle, style, ...props }: TextFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        placeholderTextColor="#B4B4B4"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    // shadow-[0px_1px_4px_rgba(0,0,0,0.25)]
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: 0,
  },
});
