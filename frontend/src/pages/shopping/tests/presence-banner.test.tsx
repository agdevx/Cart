// ABOUTME: Tests for PresenceBanner component
// ABOUTME: Verifies rendering of shopping presence indicators

import { createElement } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PresenceBanner } from '../presence-banner'

describe('PresenceBanner', () => {
  it('should not render when no users are present', () => {
    const { container } = render(createElement(PresenceBanner, { users: [] }))
    expect(container.firstChild).toBeNull()
  })

  it('should render single user with initial and message', () => {
    render(createElement(PresenceBanner, {
      users: [{ userId: '1', userName: 'Sarah' }],
    }))
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('Sarah is shopping with you')).toBeInTheDocument()
  })

  it('should render multiple users with initials and message', () => {
    render(createElement(PresenceBanner, {
      users: [
        { userId: '1', userName: 'Sarah' },
        { userId: '2', userName: 'Mike' },
      ],
    }))
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('Sarah and Mike are shopping with you')).toBeInTheDocument()
  })

  it('should render three users with comma-separated names', () => {
    render(createElement(PresenceBanner, {
      users: [
        { userId: '1', userName: 'Sarah' },
        { userId: '2', userName: 'Mike' },
        { userId: '3', userName: 'Bob' },
      ],
    }))
    expect(screen.getByText('Sarah, Mike, and Bob are shopping with you')).toBeInTheDocument()
  })

  it('should use first character of name for initial', () => {
    render(createElement(PresenceBanner, {
      users: [{ userId: '1', userName: 'august' }],
    }))
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
