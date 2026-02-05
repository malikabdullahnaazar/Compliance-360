import api from './api';

const login = async (username, password) => {
    const response = await api.post('auth/login/', { username, password });
    if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
};

const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
