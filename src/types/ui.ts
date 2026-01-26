import { ReactNode } from 'react';

// UI Component Props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Form Types
export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Table Types
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onRowClick?: (record: T, index: number) => void;
  rowKey?: keyof T | ((record: T) => string);
  className?: string;
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showQuickJumper?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

// Chart Types
export interface ChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface LineChartData {
  date: string | Date;
  value: number;
  [key: string]: any;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface ChartProps {
  data: ChartData[] | LineChartData[];
  width?: number;
  height?: number;
  responsive?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  className?: string;
}

// Modal and Dialog Types
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

// Notification Types
export interface NotificationProps {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Layout Types
export interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children?: SidebarItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

// Filter and Search Types
export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

export interface FilterGroup {
  title: string;
  key: string;
  options: FilterOption[];
  multiple?: boolean;
  searchable?: boolean;
}

export interface SearchFilters {
  query?: string;
  filters: Record<string, string | string[] | number | number[]>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// Loading States
export interface LoadingState {
  loading: boolean;
  error?: string;
  lastUpdated?: Date;
}

export interface AsyncState<T> extends LoadingState {
  data?: T;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  radius: 'sm' | 'md' | 'lg';
  animations: boolean;
}

// Responsive Types
export type BreakpointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}
