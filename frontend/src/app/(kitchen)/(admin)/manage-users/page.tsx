"use client";
import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '@/lib/api';
import { User, Role } from '@/types/user';
import UserFormDialog from '@/components/UserFormDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { createUser, deleteUserById, fetchAllUsers, fetchUserProfile, updateUser } from '@/store/slices/userSlice';
import ProtectRoute from "@/components/ProtectRoute";

const roleLabels = {
  [Role.Admin]: 'Admin',
  [Role.Employee]: 'Employee',
  [Role.Client]: 'Client',
};

const ManageUsersPage = () => {
  const { users, loading, error } = useAppSelector(state => state.user);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>();
  const [deleteUser, setDeleteUser] = useState<User | undefined>();
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState<keyof User>('firstName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const dispatch = useAppDispatch();

  useEffect(() => { dispatch(fetchAllUsers()); }, [dispatch]);

  const handleAdd = () => { setEditUser(undefined); setFormOpen(true); };
  const handleEdit = (user: User) => { setEditUser(user); setFormOpen(true); };
  const handleDelete = (user: User) => { setDeleteUser(user); };

  // Pour la création et la modification, on utilise l'API Redux si tu ajoutes les thunks correspondants
  const handleFormSubmit = async (user: Partial<User>) => {
    setActionLoading(true);
    setBackendError(null);
    try {
      if (editUser) {
        await dispatch(updateUser({ id: editUser._id, data: user }));
      } else {
        await dispatch(createUser(user));
      }
      setFormOpen(false);
      dispatch(fetchAllUsers());
    } catch (e: any) {
      setBackendError(e.response?.data?.message || 'Error while saving');
    } finally {
      setActionLoading(false);
    }
  };

  // Pour la suppression, pareil
  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      await dispatch(deleteUserById(deleteUser._id));
      setDeleteUser(undefined);
      dispatch(fetchAllUsers());
    } catch (e: any) {
      setBackendError(e.response?.data?.message || 'Error while deleting');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSort = (field: keyof User) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Remplacer filteredUsers/users par users du store
  const filteredUsers = (users ?? []).filter(user => {
    const search = filter.toLowerCase();
    return (
      (user.firstName?.toLowerCase().includes(search) || '') ||
      (user.lastName?.toLowerCase().includes(search) || '') ||
      (user.email?.toLowerCase().includes(search) || '') ||
      (user.phone?.toLowerCase().includes(search) || '')
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortBy] ?? '';
    const bValue = b[sortBy] ?? '';
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  return (
    <ProtectRoute allowedRoles={[Role.Admin]}>
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={3}>User Management</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ mr: 2 }}>Add User</Button>
          <Box sx={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Filter by name, email, phone..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 16 }}
            />
          </Box>
        </Box>
        {backendError && <Box sx={{ mb: 2 }}><Typography color="error" component="div">{backendError}</Typography></Box>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell onClick={() => handleSort('firstName')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    First Name {sortBy === 'firstName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell onClick={() => handleSort('lastName')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Last Name {sortBy === 'lastName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell onClick={() => handleSort('email')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Email {sortBy === 'email' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell onClick={() => handleSort('phone')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Phone {sortBy === 'phone' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell onClick={() => handleSort('role')} sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Role {sortBy === 'role' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUsers.map(user => (
                  <TableRow key={user._id}>
                    <TableCell>{user.firstName}</TableCell>
                    <TableCell>{user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell><Chip label={roleLabels[user.role]} color={user.role === Role.Admin ? 'primary' : user.role === Role.Employee ? 'secondary' : 'default'} /></TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(user)}><EditIcon /></IconButton>
                      <IconButton onClick={() => handleDelete(user)} color="error"><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <UserFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} initialUser={editUser} />
        <ConfirmDialog open={!!deleteUser} title="Delete User" content={`Are you sure you want to delete ${deleteUser?.firstName} ${deleteUser?.lastName}?`} onClose={() => setDeleteUser(undefined)} onConfirm={handleDeleteConfirm} />
        {actionLoading && <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%' }} />}
      </Box>
    </ProtectRoute>
  );
};

export default ManageUsersPage;
