import api from './api';

export interface UserProfile {
  id?: number;
  user?: number;

  // Step 1 - Public
  firstname?: string;
  secondname?: string;
  thirdname?: string;
  fathername1?: string;
  fathername2?: string;
  mothername1?: string;
  mothername2?: string;
  gender?: string;

  // Step 2 - Private
  dateofbirth?: string;
  age?: number;
  native?: string;
  present_city?: string;
  taluk?: string;
  district?: string;
  state?: string;
  contact_number?: string;
  nationality?: string;

  // Step 3 - Cultural
  cultureoflife?: string;
  familyname1?: string;
  familyname2?: string;
  familyname3?: string;
  familyname4?: string;
  familyname5?: string;
  preferred_language?: string;
  religion?: string;
  caste?: string;

  // System fields
  created_at?: string;
  updated_at?: string;
  image?: string | File | null;
}

export interface OTPRequest {
  phone_number: string;
}

export interface OTPVerify {
  mobile_number: string;
  otp: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    mobile_number: string;
    is_active: boolean;
  };
}

class AuthService {

  async requestOTP(phoneNumber: string): Promise<{ message: string }> {
    const response = await api.post('/api/auth/request-otp/', {
      phone_number: phoneNumber,
    });
    return response.data;
  }

  async verifyOTP(mobileNumber: string, otp: string): Promise<AuthResponse> {
    const response = await api.post('/api/auth/verify-otp/', {
      mobile_number: mobileNumber,
      otp,
    });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    const response = await api.post('/api/auth/refresh-token/', {
      refresh: refreshToken,
    });
    return response.data;
  }

  async getMyProfile(): Promise<UserProfile> {
    const response = await api.get('/api/profiles/me/');
    return response.data;
  }

  // ✅ SINGLE updateMyProfile (FormData version)
  async updateMyProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const formData = new FormData();

    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });

    const response = await api.put(
      '/api/profiles/me/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUserName');
    sessionStorage.clear();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export const authService = new AuthService();
export default authService;
