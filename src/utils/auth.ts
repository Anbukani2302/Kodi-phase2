// src/utils/auth.ts

export const getAuthToken = (): string | null => {
    // Option 1: If you're using localStorage
    return localStorage.getItem('access_token');
    
    // Option 2: If you're using sessionStorage
    // return sessionStorage.getItem('access_token');
    
    // Option 3: If you're using cookies
    // const cookies = document.cookie.split('; ');
    // const tokenCookie = cookies.find(row => row.startsWith('access_token='));
    // return tokenCookie ? tokenCookie.split('=')[1] : null;
    
    // Option 4: If you're using Redux or Context
    // return store.getState().auth.token;
  };
  
  export const setAuthToken = (token: string): void => {
    localStorage.setItem('access_token', token);
  };
  
  export const removeAuthToken = (): void => {
    localStorage.removeItem('access_token');
  };
  
  export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
  };