import api from './api';

export const getVehicles = async () => {
  const { data } = await api.get('/vehicles');
  return data;
};

export const getVehicleDetails = async (vehicleId) => {
  const { data } = await api.get(`/vehicles/${vehicleId}`);
  return data;
};

export const selectVehicle = async () => {
  const { data } = await api.get('/vehicles/select');
  return data;
};

export const addVehicle = async (vehicleData) => {
  const { data } = await api.post('/vehicles', vehicleData);
  return data;
};

export const modifyVehicle = async (vehicleId, updates) => {
  const { data } = await api.put(`/vehicles/${vehicleId}`, updates);
  return data;
};

export const deleteVehicle = async (vehicleId) => {
  const { data } = await api.delete(`/vehicles/${vehicleId}`);
  return data;
};
