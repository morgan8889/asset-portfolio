import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';
import { TestProviders } from './test-providers';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withProviders?: boolean;
}

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { withProviders = true, ...renderOptions } = options;

  const wrapper = withProviders ? TestProviders : undefined;

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper, ...renderOptions }),
  };
};

export const waitForDataLoad = (timeout = 5000) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export const createFormData = (data: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

export const mockApiError = (message: string, status = 500) => ({
  ok: false,
  status,
  json: () => Promise.reject(new Error(message)),
  text: () => Promise.reject(new Error(message)),
});

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Re-export testing library utilities
export * from '@testing-library/react';
export { userEvent };
export { customRender as render };
