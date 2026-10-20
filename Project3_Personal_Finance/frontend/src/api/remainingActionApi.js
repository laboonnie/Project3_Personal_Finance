
import api from './api';

export const remainingActionApi = {
    getSummary: (month, year) =>
        api.get(`/RemainingActions/summary?month=${month}&year=${year}`),

    getActions: (month, year) =>
        api.get(`/RemainingActions?month=${month}&year=${year}`),

    create: (data) =>
        api.post('/RemainingActions', data),

    createCarryOver: (data) =>
        api.post('/RemainingActions/carry-over', data),

    createJarTransfer: (data) =>
        api.post('/RemainingActions/jar-transfer', data)
};
