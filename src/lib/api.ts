const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    // If response is not JSON, it might be a network error
    if (!response.ok) {
      throw new ApiError(
        `Network error: ${response.statusText || 'Failed to connect to server'}`,
        response.status
      );
    }
    throw new ApiError('Invalid response from server', response.status);
  }
  
  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || 'An error occurred',
      response.status
    );
  }
  
  return data.data || data;
}

// Get auth token from localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Set auth token in localStorage
function setToken(token: string): void {
  localStorage.setItem('token', token);
}

// Remove auth token from localStorage
function removeToken(): void {
  localStorage.removeItem('token');
}

// Make authenticated API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    return handleResponse<T>(response);
  } catch (error) {
    // Handle network errors (server not reachable, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Cannot connect to server. Make sure the backend is running on http://localhost:5000',
        0
      );
    }
    throw error;
  }
}

// Auth API
export const authApi = {
  signup: async (email: string, password: string, fullName: string) => {
    const response = await apiRequest<{
      user: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
        createdAt: string;
      };
      token: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    
    setToken(response.token);
    return response;
  },
  
  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      user: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
        createdAt: string;
      };
      token: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    setToken(response.token);
    return response;
  },
  
  getMe: async () => {
    const response = await apiRequest<{
      user: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
        createdAt: string;
      };
    }>('/auth/me');
    return response;
  },
  
  logout: () => {
    removeToken();
  },
};

// Groups API
export const groupsApi = {
  getAll: async () => {
    return apiRequest<any[]>('/groups');
  },
  
  getById: async (id: string) => {
    return apiRequest<any>(`/groups/${id}`);
  },
  
  create: async (data: { name: string; description?: string; currency?: string; memberEmails?: string[] }) => {
    return apiRequest<any>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<any>(`/groups/${id}`, {
      method: 'DELETE',
    });
  },
};

// Expenses API
export const expensesApi = {
  getAll: async (groupId?: string) => {
    const query = groupId ? `?groupId=${groupId}` : '';
    return apiRequest<any[]>(`/expenses${query}`);
  },
  
  create: async (data: {
    groupId: string;
    description: string;
    amount: number;
    paidBy?: string;
    paidTo?: string;
    paymentMethod?: 'cash' | 'upi' | 'card';
    splitType?: 'equal' | 'percentage' | 'share';
    splits?: Array<{
      userId: string;
      amount: number;
      percentage?: number;
      shares?: number;
      isPaid?: boolean;
    }>;
    category: string;
    date?: string;
    isRecurring?: boolean;
    recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  }) => {
    return apiRequest<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Activity API
export const activityApi = {
  getAll: async (groupId?: string) => {
    const query = groupId ? `?groupId=${groupId}` : '';
    return apiRequest<any[]>(`/activity${query}`);
  },
};

// Settlements API
export const settlementsApi = {
  getAll: async (groupId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (groupId) params.append('groupId', groupId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/settlements${query}`);
  },
  
  calculate: async (groupId: string) => {
    return apiRequest<any[]>(`/settlements/calculate?groupId=${groupId}`);
  },
  
  create: async (data: {
    groupId: string;
    fromUser: string;
    toUser: string;
    amount: number;
    paymentMethod?: 'cash' | 'upi' | 'card';
    note?: string;
  }) => {
    return apiRequest<any>('/settlements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  confirm: async (id: string) => {
    return apiRequest<any>(`/settlements/${id}/confirm`, {
      method: 'PATCH',
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getSummary: async () => {
    return apiRequest<{
      totalOwed: number;
      totalOwe: number;
      netBalance: number;
      totalGroups: number;
      thisMonthExpenses: number;
      pendingSettlements: number;
      groups: any[];
      recentExpenses: any[];
      debtRelations: Array<{
        fromUser: { id: string; name: string; email: string; avatar?: string };
        toUser: { id: string; name: string; email: string; avatar?: string };
        amount: number;
        groupId?: string;
        groupName?: string;
      }>;
    }>('/dashboard/summary');
  },
};

export { getToken, setToken, removeToken, ApiError };

