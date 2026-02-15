// ABOUTME: Tests for RegisterPage component
// ABOUTME: Verifies form rendering, validation, and submission behavior

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterPage } from './register-page';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/apis/tanstack-query/query-client';
import { BrowserRouter } from 'react-router-dom';
import { createElement } from 'react';

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
});
