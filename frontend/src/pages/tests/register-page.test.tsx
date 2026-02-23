// ABOUTME: Tests for RegisterPage component
// ABOUTME: Verifies form rendering, validation, and submission behavior

import { createElement } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect,it } from 'vitest';

import { queryClient } from '@/apis/tanstack-query/query-client';

import { RegisterPage } from '../register-page';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children));

describe('RegisterPage', () => {
  it('renders email input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders display name input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it('renders sign up button', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    render(createElement(RegisterPage), { wrapper });
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows password requirements', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
  });

  it('validates password length', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password has uppercase', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'lowercase123' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
    });
  });

  it('validates password has number', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'NoNumbers' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(createElement(RegisterPage), { wrapper });
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates display name is required', async () => {
    render(createElement(RegisterPage), { wrapper });
    const displayNameInput = screen.getByLabelText(/display name/i);

    fireEvent.change(displayNameInput, { target: { value: '' } });
    fireEvent.blur(displayNameInput);

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });
  });

  it('renders confirm password input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows error when confirm password is empty on blur', async () => {
    render(createElement(RegisterPage), { wrapper });
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.focus(confirmPasswordInput);
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
    });
  });

  it('shows mismatch error when passwords do not match', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password2' } });
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows no error when passwords match', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password1' } });
    fireEvent.blur(confirmPasswordInput);

    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/please confirm your password/i)).not.toBeInTheDocument();
    });
  });

  it('disables submit when passwords do not match', () => {
    render(createElement(RegisterPage), { wrapper });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const displayNameInput = screen.getByLabelText(/display name/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password2' } });
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } });

    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled();
  });

  it('enables submit when all fields valid and passwords match', () => {
    render(createElement(RegisterPage), { wrapper });
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const displayNameInput = screen.getByLabelText(/display name/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password1' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password1' } });
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } });

    expect(screen.getByRole('button', { name: /sign up/i })).toBeEnabled();
  });
});
