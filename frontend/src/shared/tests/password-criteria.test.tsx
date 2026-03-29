// ABOUTME: Tests for PasswordCriteria shared component
// ABOUTME: Verifies checklist updates based on password input

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PasswordCriteria } from '../password-criteria'

describe('PasswordCriteria', () => {
  it('should show all unchecked for empty password', () => {
    render(<PasswordCriteria password="" />)
    expect(screen.getByText('○ 8+ characters')).toBeInTheDocument()
    expect(screen.getByText('○ One uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('○ One number')).toBeInTheDocument()
  })

  it('should check length requirement when met', () => {
    render(<PasswordCriteria password="abcdefgh" />)
    expect(screen.getByText('✓ 8+ characters')).toBeInTheDocument()
  })

  it('should check uppercase requirement when met', () => {
    render(<PasswordCriteria password="A" />)
    expect(screen.getByText('✓ One uppercase letter')).toBeInTheDocument()
  })

  it('should check number requirement when met', () => {
    render(<PasswordCriteria password="1" />)
    expect(screen.getByText('✓ One number')).toBeInTheDocument()
  })
})
