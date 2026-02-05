import api from './api';

const login = async (email, password) => {
    try {
        const response = await api.post('auth/login/', { email, password });
        if (response.data && response.data.access) {
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            return response.data;
        }
        throw new Error('Invalid response from server');
    } catch (error) {
        console.error('Login service error:', error);
        throw error;
    }
};

const logout = async () => {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            await api.post('auth/logout/', { refresh_token: refreshToken });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
};

const getCurrentUser = async () => {
    const response = await api.get('auth/me/');
    return response.data;
};

const authService = {
    login,
    logout,
    getCurrentUser,
};

export default authService;
