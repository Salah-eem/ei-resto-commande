"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { fetchUserProfile, updateUser } from "@/store/slices/userSlice";
import Link from "next/link";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import TextField from "@mui/material/TextField";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import { Role } from "@/types/user";
import { useFormik } from "formik";
import * as yup from "yup";
import api from "@/lib/api";
import { isValidPhoneNumber } from "libphonenumber-js";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Avatar from "@mui/material/Avatar";

// Liste d'indicatifs pays
const countryCodes: { code: string; label: string }[] = [
  { code: "+32", label: "🇧🇪 +32" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+41", label: "🇨🇭 +41" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
];

const roleLabels: Record<Role, string> = {
  [Role.Admin]: "Admin",
  [Role.Employee]: "Employee",
  [Role.Client]: "Client",
};

const passwordValidationSchema = yup.object({
  password: yup
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .matches(/[0-9]/, "Password must contain at least one digit")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(
      /[!@#$%^&*(),.?":{}|<>\[\]\\/;'`~]/,
      "Password must contain at least one special character"
    ),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), ""], "Passwords must match")
    .required("Please confirm your password"),
});

const checkEmailUnique = async (email: string, userId?: string) => {
  try {
    const res = await api.post(`/user/check-email`, { email, userId });
    return res.data.unique;
  } catch {
    return true;
  }
};

const checkFullNameUnique = async (
  firstName: string,
  lastName: string,
  userId?: string
) => {
  try {
    const res = await api.post(`/user/check-fullname`, {
      firstName,
      lastName,
      userId,
    });
    return res.data.unique;
  } catch {
    return true;
  }
};

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile, loading, error } = useAppSelector((state) => state.user);
  const token = useAppSelector((state) => state.auth.token);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [tab, setTab] = useState(0);
  const [emailUniqueError, setEmailUniqueError] = React.useState<string | null>(
    null
  );
  const [fullNameUniqueError, setFullNameUniqueError] = React.useState<
    string | null
  >(null);
  const [countryCode, setCountryCode] = useState<string>(countryCodes[0].code);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const debounceRef = React.useRef<{
    email?: NodeJS.Timeout;
    name?: NodeJS.Timeout;
  }>({});

  const profileValidationSchema = React.useMemo(
    () =>
      yup.object({
        firstName: yup
          .string()
          .trim()
          .required("First name is required")
          .min(3, "At least 3 characters"),
        lastName: yup
          .string()
          .trim()
          .required("Last name is required")
          .min(3, "At least 3 characters"),
        email: yup
          .string()
          .email("Invalid email")
          .required("Email is required"),
        phone: yup
          .string()
          .nullable()
          // 1) on transforme la valeur brute pour y ajouter countryCode si besoin
          .transform((value, original) => {
            if (!original) return original;
            // supprime les zéros de tête puis préfixe
            const stripped = original.replace(/^0+/, "");
            return original.startsWith(countryCode)
              ? original
              : countryCode + stripped;
          })
          // 2) on valide ensuite le format complet
          .test(
            "is-valid-phone",
            "Phone must be a valid phone number",
            (transformed) => {
              if (!transformed) return true; // champ facultatif
              return isValidPhoneNumber(transformed);
            }
          ),
      }),
    [countryCode]
  );

  useEffect(() => {
    if (token && !profile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, token, profile]);

  const profileFormik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
    },
    validationSchema: profileValidationSchema,
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      const data: Partial<typeof values> = { ...values };
      if (data.phone) {
        // Ajoute l'indicatif pays devant le numéro si pas déjà présent
        if (!data.phone.startsWith(countryCode)) {
          data.phone = countryCode + data.phone.replace(/^0+/, "");
        }
      } else {
        delete data.phone;
      }

      setEditError(null);
      setEditSuccess(false);
      setSubmitting(true);
      try {
        if (!profile) return;
        const result = await dispatch(updateUser({ id: profile._id, data }));
        let backendMessage: string | null = null;
        // Gestion simplifiée : toujours lire result.payload.message si rejected
        if (
          result.type.endsWith("/rejected") &&
          result.payload &&
          typeof result.payload === "object" &&
          "message" in result.payload
        ) {
          const msg = (result.payload as any).message;
          backendMessage = Array.isArray(msg) ? msg.join(" ") : msg;
        }
        // Si fulfilled mais payload contient une erreur (cas rare)
        else if (
          result.type.endsWith("/fulfilled") &&
          result.payload &&
          typeof result.payload === "object" &&
          "message" in result.payload
        ) {
          const msg = (result.payload as any).message;
          backendMessage = Array.isArray(msg) ? msg.join(" ") : msg;
        }
        if (backendMessage) {
          setEditError(backendMessage);
          setEditSuccess(false);
        } else {
          await dispatch(fetchUserProfile());
          setEditSuccess(true);
        }
      } catch (e: any) {
        setEditError(e?.message || "Error updating profile");
        setEditSuccess(false);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: passwordValidationSchema,
    onSubmit: async (values, { setSubmitting, setStatus, resetForm }) => {
      setPasswordError(null);
      setPasswordSuccess(false);
      setSubmitting(true);
      try {
        if (!profile) return;
        await dispatch(
          updateUser({ id: profile._id, data: { password: values.password } })
        );
        setPasswordSuccess(true);
        resetForm();
      } catch (e: any) {
        setPasswordError(e?.message || "Error updating password");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Email uniqueness check on input
  React.useEffect(() => {
    if (!profileFormik.values.email || profileFormik.values.email.length < 3) {
      setEmailUniqueError(null);
      return;
    }
    if (debounceRef.current.email) clearTimeout(debounceRef.current.email);
    debounceRef.current.email = setTimeout(async () => {
      const unique = await checkEmailUnique(
        profileFormik.values.email,
        profile?._id
      );
      setEmailUniqueError(unique ? null : "This email is already used.");
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileFormik.values.email]);

  // Full name uniqueness check on input
  React.useEffect(() => {
    if (
      !profileFormik.values.firstName ||
      !profileFormik.values.lastName ||
      profileFormik.values.firstName.length < 3 ||
      profileFormik.values.lastName.length < 3
    ) {
      setFullNameUniqueError(null);
      return;
    }
    if (debounceRef.current.name) clearTimeout(debounceRef.current.name);
    debounceRef.current.name = setTimeout(async () => {
      const unique = await checkFullNameUnique(
        profileFormik.values.firstName,
        profileFormik.values.lastName,
        profile?._id
      );
      setFullNameUniqueError(
        unique
          ? null
          : "This first name and last name combination is already used."
      );
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileFormik.values.firstName, profileFormik.values.lastName]);

  const isFormValid = React.useMemo(() => {
    // formik.isValid ne prend pas en compte les erreurs async, donc on vérifie aussi les erreurs d'unicité
    return (
      profileFormik.isValid &&
      !emailUniqueError &&
      !fullNameUniqueError &&
      Object.keys(profileFormik.errors).length === 0
    );
  }, [
    profileFormik.isValid,
    emailUniqueError,
    fullNameUniqueError,
    profileFormik.errors,
  ]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setPhotoUploading(true);
    setPhotoError(null);
    setPhotoSuccess(false);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      await api.put("/user/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await dispatch(fetchUserProfile());
      setPhotoSuccess(true);
    } catch (err: any) {
      setPhotoError(err?.response?.data?.message || "Error uploading photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
        }}
      >
        <Alert severity="info">
          You must be logged in to view your profile.
        </Alert>
        <Link href="/login" passHref legacyBehavior>
          <Button variant="contained" sx={{ mt: 2 }}>
            Log In
          </Button>
        </Link>
      </Box>
    );
  }

  if (loading && !profile) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) return null;
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "linear-gradient(135deg, #e3f0ff 0%, #f6f8fa 100%)",
        py: { xs: 2, sm: 4, md: 8 },
        px: { xs: 1, sm: 2 }
      }}
    >
      <Box sx={{ maxWidth: { xs: "100%", sm: 500, md: 440 }, mx: "auto", px: { xs: 1, sm: 2 } }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, sm: 3, md: 5 },
            borderRadius: 5,
            textAlign: "center",
            boxShadow: "0 8px 32px 0 rgba(25, 118, 210, 0.10)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ position: "relative", display: "inline-block", mb: 2 }}>
              <Avatar
                src={
                  profile.photoUrl
                    ? `${process.env.NEXT_PUBLIC_API_URL}/${profile.photoUrl}`
                    : undefined
                }
                alt={`${profile.firstName} ${profile.lastName}`}
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: 40,
                  bgcolor: "#1976d2",
                }}
              >
                {!profile.photoUrl &&
                  `${profile.firstName?.[0] || ""}${
                    profile.lastName?.[0] || ""
                  }`}
              </Avatar>

              <IconButton
                component="label"
                htmlFor="upload-photo"
                sx={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  bgcolor: "#fff",
                  color: "#1976d2",
                  p: 0.5,
                  borderRadius: "50%",
                  boxShadow: 2,
                  zIndex: 1,
                }}
                disabled={photoUploading}
              >
                <input
                  hidden
                  id="upload-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <PhotoCamera fontSize="large" />
              </IconButton>

              {photoUploading && (
                <CircularProgress
                  size={32}
                  sx={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    zIndex: 2,
                  }}
                />
              )}
            </Box>
            {photoError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {photoError}
              </Alert>
            )}
            {photoSuccess && (
                <Alert severity="success" sx={{ mb: 1 }}>
                    Photo uploaded successfully!
                </Alert>
            )}
            <Typography
              variant="h5"
              fontWeight={700}
              gutterBottom
              letterSpacing={1}
            >
              {profileFormik.values.firstName} {profileFormik.values.lastName}
            </Typography>
            <Chip
              icon={<BadgeIcon />}
              label={roleLabels[profile.role] || profile.role}
              color={
                profile.role === Role.Admin
                  ? "primary"
                  : profile.role === Role.Employee
                  ? "secondary"
                  : "default"
              }
              sx={{
                mt: 1,
                fontWeight: 600,
                px: 2,
                fontSize: 16,
                borderRadius: 2,
              }}
            />
          </Box>
          <Box sx={{ mt: 3, textAlign: "left" }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              centered
              sx={{ mb: 3 }}
            >
              <Tab label="Personal Info" />
              <Tab label="Change Password" />
            </Tabs>
            {tab === 0 && (
              <form onSubmit={profileFormik.handleSubmit} autoComplete="off">
                <TextField
                  label="First Name"
                  name="firstName"
                  value={profileFormik.values.firstName}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  fullWidth
                  margin="normal"
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <AccountCircleIcon sx={{ color: "#1976d2", mr: 1 }} />
                    ),
                  }}
                  error={
                    (profileFormik.touched.firstName &&
                      Boolean(profileFormik.errors.firstName)) ||
                    Boolean(fullNameUniqueError)
                  }
                  helperText={
                    profileFormik.touched.firstName &&
                    profileFormik.errors.firstName
                  }
                />
                <TextField
                  label="Last Name"
                  name="lastName"
                  value={profileFormik.values.lastName}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  fullWidth
                  margin="normal"
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <AccountCircleIcon sx={{ color: "#1976d2", mr: 1 }} />
                    ),
                  }}
                  error={
                    (profileFormik.touched.lastName &&
                      Boolean(profileFormik.errors.lastName)) ||
                    Boolean(fullNameUniqueError)
                  }
                  helperText={
                    (profileFormik.touched.lastName &&
                      profileFormik.errors.lastName) ||
                    (fullNameUniqueError ? fullNameUniqueError : "")
                  }
                />
                <TextField
                  label="Email"
                  name="email"
                  value={profileFormik.values.email}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  fullWidth
                  margin="normal"
                  size="medium"
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <EmailIcon sx={{ color: "#1976d2", mr: 1 }} />
                    ),
                  }}
                  error={
                    (profileFormik.touched.email &&
                      Boolean(profileFormik.errors.email)) ||
                    Boolean(emailUniqueError)
                  }
                  helperText={
                    (profileFormik.touched.email &&
                      profileFormik.errors.email) ||
                    (emailUniqueError ? emailUniqueError : "")
                  }
                />
                <TextField
                  label="Phone"
                  name="phone"
                  value={profileFormik.values.phone}
                  onChange={profileFormik.handleChange}
                  onBlur={profileFormik.handleBlur}
                  fullWidth
                  margin="normal"
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: "#1976d2", mr: 1 }} />
                        <TextField
                          select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          variant="standard"
                          sx={{
                            width: 70,
                            ml: 1,
                            mr: 1,
                            "& .MuiInputBase-input": { fontSize: 14, p: 0 },
                          }}
                          inputProps={{ "aria-label": "country code" }}
                        >
                          {countryCodes.map((opt) => (
                            <MenuItem key={opt.code} value={opt.code}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </InputAdornment>
                    ),
                  }}
                  error={
                    profileFormik.touched.phone &&
                    Boolean(profileFormik.errors.phone)
                  }
                  helperText={
                    profileFormik.touched.phone && profileFormik.errors.phone
                  }
                />
                <TextField
                  label="Role"
                  value={roleLabels[profile.role] || profile.role}
                  fullWidth
                  margin="normal"
                  size="medium"
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <BadgeIcon sx={{ color: "#1976d2", mr: 1 }} />
                    ),
                  }}
                />
                {editError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {editError}
                  </Alert>
                )}
                {editSuccess && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Profile updated!
                  </Alert>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  type="submit"
                  sx={{
                    mt: 4,
                    fontWeight: 600,
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontSize: 18,
                    boxShadow: "0 2px 8px 0 rgba(25, 118, 210, 0.10)",
                  }}
                  disabled={profileFormik.isSubmitting || !isFormValid}
                  size="large"
                  fullWidth
                >
                  {profileFormik.isSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </form>
            )}
            {tab === 1 && (
              <Box sx={{ pt: 2 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  mb={1}
                  color="#1976d2"
                >
                  Change Password
                </Typography>
                <form onSubmit={passwordFormik.handleSubmit} autoComplete="off">
                  <TextField
                    label="New Password"
                    name="password"
                    type="password"
                    value={passwordFormik.values.password}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    fullWidth
                    margin="normal"
                    size="medium"
                    InputProps={{
                      startAdornment: (
                        <LockIcon sx={{ color: "#1976d2", mr: 1 }} />
                      ),
                    }}
                    autoComplete="new-password"
                    error={
                      passwordFormik.touched.password &&
                      Boolean(passwordFormik.errors.password)
                    }
                    helperText={
                      passwordFormik.touched.password &&
                      passwordFormik.errors.password
                    }
                  />
                  <TextField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordFormik.values.confirmPassword}
                    onChange={passwordFormik.handleChange}
                    onBlur={passwordFormik.handleBlur}
                    fullWidth
                    margin="normal"
                    size="medium"
                    InputProps={{
                      startAdornment: (
                        <LockIcon sx={{ color: "#1976d2", mr: 1 }} />
                      ),
                    }}
                    autoComplete="new-password"
                    error={
                      passwordFormik.touched.confirmPassword &&
                      Boolean(passwordFormik.errors.confirmPassword)
                    }
                    helperText={
                      passwordFormik.touched.confirmPassword &&
                      passwordFormik.errors.confirmPassword
                    }
                  />
                  {passwordError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {passwordError}
                    </Alert>
                  )}
                  {passwordSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Password updated!
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    type="submit"
                    sx={{
                      mt: 2,
                      fontWeight: 600,
                      borderRadius: 3,
                      px: 4,
                      py: 1,
                      fontSize: 16,
                      boxShadow: "0 2px 8px 0 rgba(25, 118, 210, 0.08)",
                    }}
                    disabled={
                      passwordFormik.isSubmitting || !passwordFormik.isValid
                    }
                    size="large"
                    fullWidth
                  >
                    {passwordFormik.isSubmitting ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </form>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ProfilePage;
