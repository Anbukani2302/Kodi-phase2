import api from './api';

export interface Connection {
  id: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ConnectionRequest {
  id: number;
  sender: {
    id: number;
    name: string;
    avatar?: string;
  };
  receiver: {
    id: number;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

class ConnectionService {
  // GET /api/connections/ - Get all connections (accepted friends)
  async getConnections(): Promise<Connection[]> {
    const response = await api.get('/api/connections/', {
      params: { status: 'accepted' },
    });
    return response.data;
  }

  // GET /api/connections/requests/ - Get pending connection requests (received)
  async getReceivedRequests(): Promise<ConnectionRequest[]> {
    const response = await api.get('/api/connections/requests/', {
      params: { type: 'received', status: 'pending' },
    });
    return response.data;
  }

  // GET /api/connections/sent/ - Get sent connection requests
  async getSentRequests(): Promise<ConnectionRequest[]> {
    const response = await api.get('/api/connections/requests/', {
      params: { type: 'sent', status: 'pending' },
    });
    return response.data;
  }

  // POST /api/connections/send/ - Send connection request
  async sendRequest(userId: number): Promise<ConnectionRequest> {
    const response = await api.post('/api/connections/send/', {
      receiver_id: userId,
    });
    return response.data;
  }

  // POST /api/connections/:id/accept/ - Accept connection request
  async acceptRequest(requestId: number): Promise<Connection> {
    const response = await api.post(`/api/connections/${requestId}/accept/`);
    return response.data;
  }

  // POST /api/connections/:id/reject/ - Reject connection request
  async rejectRequest(requestId: number): Promise<void> {
    await api.post(`/api/connections/${requestId}/reject/`);
  }

  // DELETE /api/connections/:id/ - Remove connection (unfriend)
  async removeConnection(connectionId: number): Promise<void> {
    await api.delete(`/api/connections/${connectionId}/`);
  }

  // GET /api/users/search/ - Search users
  async searchUsers(query: string): Promise<Connection['user'][]> {
    const response = await api.get('/api/users/search/', {
      params: { q: query },
    });
    return response.data;
  }

  // GET /api/users/suggestions/ - Get friend suggestions
  async getSuggestions(): Promise<Connection['user'][]> {
    const response = await api.get('/api/users/suggestions/');
    return response.data;
  }
}

export const connectionService = new ConnectionService();
export default connectionService;
