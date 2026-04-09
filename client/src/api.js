import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL
});

export const getVehicles = () => api.get('/vehicles');
export const getVehicle = (id) => api.get(`/vehicles/${id}`);
export const createVehicle = (data) => api.post('/vehicles', data);
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data);
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);
export const uploadPhotos = (id, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    return api.post(`/vehicles/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const deletePhoto = (id) => api.delete(`/photos/${id}`);
export const importExcel = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const getVehiclesNoPhotos = () => api.get('/stats/no-photos');
export const recordSale = (data) => api.post('/sales', data);
export const getSalesStats = () => api.get('/sales/stats');

export default api;
export { API_BASE_URL };
