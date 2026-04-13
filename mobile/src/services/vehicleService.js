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

export const addVehicle = async (vehicleData, registrationCardUri) => {
  const formData = new FormData();
  for (const [key, val] of Object.entries(vehicleData)) {
    if (val !== undefined && val !== null) formData.append(key, val);
  }
  if (registrationCardUri) {
    formData.append('registrationCardImage', {
      uri: registrationCardUri,
      type: 'image/jpeg',
      name: 'registration_card.jpg',
    });
  }
  const { data } = await api.post('/vehicles', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const modifyVehicle = async (vehicleId, updates, registrationCardUri) => {
  const formData = new FormData();
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined && val !== null) formData.append(key, val);
  }
  if (registrationCardUri) {
    formData.append('registrationCardImage', {
      uri: registrationCardUri,
      type: 'image/jpeg',
      name: 'registration_card.jpg',
    });
  }
  const { data } = await api.put(`/vehicles/${vehicleId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteVehicle = async (vehicleId) => {
  const { data } = await api.delete(`/vehicles/${vehicleId}`);
  return data;
};
