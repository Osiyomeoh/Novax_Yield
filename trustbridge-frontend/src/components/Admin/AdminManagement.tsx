import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import { useWallet } from '../../contexts/WalletContext';
import { ArrowLeft, Home, ChevronRight } from 'lucide-react';
import Button from '../UI/Button';

interface AdminUser {
  _id: string;
  walletAddress: string;
  role: string;
  createdAt: string;
}

interface AdminStats {
  totalAdmins: number;
  superAdmins: number;
  platformAdmins: number;
  amcAdmins: number;
  regularAdmins: number;
}

const AdminManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, adminRole, checkAdminStatus } = useAdmin();
  const { address } = useWallet();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignRole, setShowAssignRole] = useState(false);
  const [assignRoleData, setAssignRoleData] = useState({
    targetWallet: '',
    role: 'ADMIN'
  });

  // Check if user has permission to manage users
  const canManageUsers = adminRole?.permissions.includes('manage_users') || false;

  useEffect(() => {
    if (canManageUsers) {
      fetchAdminUsers();
      fetchAdminStats();
    }
  }, [canManageUsers]);

  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }

      const users = await response.json();
      setAdminUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      const stats = await response.json();
      setAdminStats(stats);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  const assignRole = async () => {
    if (!assignRoleData.targetWallet || !assignRoleData.role) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/assign-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignRoleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign role');
      }

      const result = await response.json();
      setError(null);
      setShowAssignRole(false);
      setAssignRoleData({ targetWallet: '', role: 'ADMIN' });
      fetchAdminUsers();
      fetchAdminStats();
      alert(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  const removeRole = async (targetWallet: string) => {
    if (!window.confirm(`Are you sure you want to remove admin role from ${targetWallet}?`)) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/remove-role`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetWallet }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove role');
      }

      const result = await response.json();
      setError(null);
      fetchAdminUsers();
      fetchAdminStats();
      alert(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    } finally {
      setLoading(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Management</h2>
        <div className="text-center text-gray-500">
          <p>You don't have permission to manage admin users.</p>
          <p className="text-sm mt-2">Required permission: manage_users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {/* Navigation Header */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors"
          >
            <Home className="w-4 h-4" />
            Admin Dashboard
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Admin Management</span>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Button>
          <div className="flex-1" />
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Management</h2>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAssignRole(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Assign Role
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Admin Statistics */}
      {adminStats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Total Admins</h3>
            <p className="text-2xl font-bold text-blue-800">{adminStats.totalAdmins}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600">Super Admins</h3>
            <p className="text-2xl font-bold text-red-800">{adminStats.superAdmins}</p>
          </div>
          <div className="bg-primary-blue p-4 rounded-lg">
            <h3 className="text-sm font-medium text-primary-blue">Platform Admins</h3>
            <p className="text-2xl font-bold text-primary-blue">{adminStats.platformAdmins}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600">AMC Admins</h3>
            <p className="text-2xl font-bold text-yellow-800">{adminStats.amcAdmins}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600">Regular Admins</h3>
            <p className="text-2xl font-bold text-gray-800">{adminStats.regularAdmins}</p>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Assign Admin Role</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={assignRoleData.targetWallet}
                  onChange={(e) => setAssignRoleData({ ...assignRoleData, targetWallet: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={assignRoleData.role}
                  onChange={(e) => setAssignRoleData({ ...assignRoleData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="PLATFORM_ADMIN">Platform Admin</option>
                  <option value="AMC_ADMIN">AMC Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAssignRole(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={assignRole}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Users List */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wallet Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adminUsers.map((user) => (
              <tr key={user._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {user.walletAddress}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                    user.role === 'PLATFORM_ADMIN' ? 'bg-primary-blue text-primary-blue' :
                    user.role === 'AMC_ADMIN' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {isSuperAdmin && user.walletAddress.toLowerCase() !== address?.toLowerCase() && (
                    <button
                      onClick={() => removeRole(user.walletAddress)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Remove Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;


