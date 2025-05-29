import React from 'react';
import { User, Role } from '@/types/user';
import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFormik } from 'formik';
import * as yup from 'yup';
import api from '@/lib/api';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (user: Partial<User>) => void;
  initialUser?: Partial<User>;
  error?: string | string[] | null;
}

const checkEmailUnique = async (email: string, userId?: string) => {
  try {
    const res = await api.post(`/user/check-email`, { email, userId });
    return res.data.unique;
  } catch {
    return true;
  }
};

const checkFullNameUnique = async (firstName: string, lastName: string, userId?: string) => {
  try {
    const res = await api.post(`/user/check-fullname`, { firstName, lastName, userId });
    return res.data.unique;
  } catch {
    return true;
  }
};

const UserFormDialog: React.FC<UserFormDialogProps> = ({ open, onClose, onSubmit, initialUser, error }) => {
  // Correction : isNew doit être true uniquement si initialUser est absent ou n'a pas d'_id
  const isNew = !initialUser || !initialUser._id;
  const [emailUniqueError, setEmailUniqueError] = React.useState<string | null>(null);
  const [fullNameUniqueError, setFullNameUniqueError] = React.useState<string | null>(null);
  const debounceRef = React.useRef<{ email?: NodeJS.Timeout; name?: NodeJS.Timeout }>({});

  // Déclaration locale du schéma de validation pour utiliser le contexte à chaque rendu
  const validationSchema = yup.object({
    firstName: yup.string().required('First name is required').min(3, 'First name must be at least 3 characters'),
    lastName: yup.string().required('Last name is required').min(3, 'Last name must be at least 3 characters'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string()
      .when('$isNew', {
        is: true,
        then: schema => schema.required('Password is required')
          .min(8, 'Password must be at least 8 characters')
          .matches(/[0-9]/, 'Password must contain at least one digit')
          .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .matches(/[!@#$%^&*(),.?":{}|<>\[\]\\;'`~]/, 'Password must contain at least one special character'),
        otherwise: schema => schema.notRequired()
          .test('min', 'Password must be at least 8 characters', value => !value || value.length >= 8)
          .test('digit', 'Password must contain at least one digit', value => !value || /[0-9]/.test(value))
          .test('upper', 'Password must contain at least one uppercase letter', value => !value || /[A-Z]/.test(value))
          .test('special', 'Password must contain at least one special character', value => !value || /[!@#$%^&*(),.?":{}|<>\[\]\\;'`~]/.test(value)),
      }),
    phone: yup.string(),
    role: yup.number().oneOf([Role.Admin, Role.Employee, Role.Client]),
  });

  const formik = useFormik({
    initialValues: {
      firstName: initialUser?.firstName || '',
      lastName: initialUser?.lastName || '',
      email: initialUser?.email || '',
      password: '',
      phone: initialUser?.phone || '',
      role: initialUser?.role ?? Role.Client,
    },
    enableReinitialize: true,
    // On retire validationSchema et on utilise validate pour injecter le contexte à chaque validation
    validate: async (values) => {
      const errors: Record<string, string> = {};
      try {
        await validationSchema.validate(values, { context: { isNew }, abortEarly: false });
      } catch (err: any) {
        if (err.inner) {
          err.inner.forEach((validationError: any) => {
            if (validationError.path) {
              errors[validationError.path] = validationError.message;
            }
          });
        }
      }
      // Email uniqueness
      if (emailUniqueError) errors.email = emailUniqueError;
      // Full name uniqueness
      if (fullNameUniqueError) errors.firstName = fullNameUniqueError;
      return errors;
    },
    onSubmit: (values) => {
      const data: Partial<typeof values> = { ...values };
      if (!values.phone) delete data.phone;
      if (!values.password) delete data.password;
      onSubmit(data);
    },
  });

  // Email uniqueness check on input
  React.useEffect(() => {
    if (!formik.values.email || formik.values.email.length < 3) {
      setEmailUniqueError(null);
      return;
    }
    if (debounceRef.current.email) clearTimeout(debounceRef.current.email);
    debounceRef.current.email = setTimeout(async () => {
      const unique = await checkEmailUnique(formik.values.email, initialUser?._id);
      setEmailUniqueError(unique ? null : 'This email is already used.');
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.email]);

  // Full name uniqueness check on input
  React.useEffect(() => {
    if (!formik.values.firstName || !formik.values.lastName || formik.values.firstName.length < 3 || formik.values.lastName.length < 3) {
      setFullNameUniqueError(null);
      return;
    }
    if (debounceRef.current.name) clearTimeout(debounceRef.current.name);
    debounceRef.current.name = setTimeout(async () => {
      const unique = await checkFullNameUnique(formik.values.firstName, formik.values.lastName, initialUser?._id);
      setFullNameUniqueError(unique ? null : 'This first name and last name combination is already used.');
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.firstName, formik.values.lastName]);

  const isFormValid = React.useMemo(() => {
    // formik.isValid ne prend pas en compte les erreurs async, donc on vérifie aussi les erreurs d'unicité
    return (
      formik.isValid &&
      !emailUniqueError &&
      !fullNameUniqueError &&
      Object.keys(formik.errors).length === 0
    );
  }, [formik.isValid, emailUniqueError, fullNameUniqueError, formik.errors]);

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{initialUser?._id ? 'Edit user' : 'Add user'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          {/* Affichage des erreurs backend Redux */}
          {error && (
            <Box sx={{ mb: 1 }}>
              {Array.isArray(error)
                ? error.map((msg, i) => (
                    <Typography color="error" key={i}>{msg}</Typography>
                  ))
                : <Typography color="error">{error}</Typography>
              }
            </Box>
          )}
          <TextField label="First Name" name="firstName" value={formik.values.firstName} onChange={formik.handleChange} onBlur={formik.handleBlur} error={!!(formik.touched.firstName && (formik.errors.firstName || fullNameUniqueError))} helperText={formik.touched.firstName && (formik.errors.firstName || fullNameUniqueError)} sx={{ mt: 2 }} />
          <TextField label="Last Name" name="lastName" value={formik.values.lastName} onChange={formik.handleChange} onBlur={formik.handleBlur} error={!!(formik.touched.lastName && !!formik.errors.lastName)} helperText={formik.touched.lastName && formik.errors.lastName} />
          <TextField label="Email" name="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} error={!!(formik.touched.email && (formik.errors.email || emailUniqueError))} helperText={formik.touched.email && (formik.errors.email || emailUniqueError)} type="email" />
          <TextField label="Password" name="password" value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.password && !!formik.errors.password} helperText={formik.touched.password && formik.errors.password} type="password" />
          <TextField label="Phone" name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur} error={formik.touched.phone && !!formik.errors.phone} helperText={formik.touched.phone && formik.errors.phone} />
          <Select label="Role" name="role" value={formik.values.role} onChange={formik.handleChange} onBlur={formik.handleBlur}>
            <MenuItem value={Role.Admin}>Admin</MenuItem>
            <MenuItem value={Role.Employee}>Employee</MenuItem>
            <MenuItem value={Role.Client}>Client</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formik.isSubmitting || !isFormValid}>{initialUser?._id ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormDialog;
