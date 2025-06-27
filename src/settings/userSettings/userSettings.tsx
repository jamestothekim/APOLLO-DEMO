import { Box, TextField } from '@mui/material';
import { Typography } from '@mui/material';
import { useUser } from '../../userContext';
import { useState, useMemo, useEffect } from 'react';
import QualSidebar from '../../reusableComponents/qualSidebar';
import {
  DynamicForm,
  FieldConfig as DynamicFormFieldConfig,
} from '../../reusableComponents/dynamicForm';
import { Stack } from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import axios from 'axios';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Define the shape of user data
interface UserDataType {
  name: string;
  email: string;
  password: string;
  fullAddress: string; // For display
  address: string; // Individual fields
  city: string;
  state_code: string;
  zip: string;
  role: string;
  division: string | undefined;
  markets: string[]; // Original market list
  displayMarkets: string[]; // Markets formatted for display
  phone_number: string | null; // Add phone number field
  two_fa_enabled: boolean; // Add 2FA status
  phone_verified: boolean; // Add phone verification status
  [key: string]: string | string[] | boolean | undefined | null; // Update index signature
}

interface FieldConfig extends DynamicFormFieldConfig {
  endAdornment?: React.ReactNode;
}

export const UserSettings = () => {
  const { user, checkAuth } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState({ current: '', new: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  const userData = useMemo<UserDataType>(() => {
    if (!user) return {} as UserDataType;

    // Construct fullAddress, filtering out empty parts
    const addressParts = [user.address, user.city, user.state_code].filter(
      (part) => part && part.trim() !== '',
    );
    let fullAddress = addressParts.join(', ');
    if (user.zip && user.zip.trim() !== '') {
      fullAddress = fullAddress ? `${fullAddress} ${user.zip}` : user.zip;
    }

    // Prepare markets for display (show 4 chips max before '+ X more')
    const allMarkets = user.user_access.Markets
      ? user.user_access.Markets.map((market) => market.market_code)
      : [];
    const displayMarkets =
      allMarkets.length > 4
        ? [...allMarkets.slice(0, 4), `+ ${allMarkets.length - 4} more`]
        : allMarkets;

    return {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      password: '********', // Static value for display
      fullAddress: fullAddress, // Use the constructed fullAddress
      address: user.address || '', // Default to empty string if null/undefined
      city: user.city || '',
      state_code: user.state_code || '',
      zip: user.zip || '',
      role: user.role,
      division: user.user_access.Division || '', // Default to empty string
      markets: allMarkets, // Keep the original list
      displayMarkets: displayMarkets, // Use this for the DynamicForm
      phone_number: user.phone_number || null,
      two_fa_enabled: user.two_fa_enabled || false,
      phone_verified: user.phone_verified || false,
    };
  }, [user]);

  // Add effect to populate phone number when user data changes
  useEffect(() => {
    if (userData.phone_number) {
      setPhoneNumber(userData.phone_number);
    }
  }, [userData.phone_number]);

  // Add effect to update phoneVerified when userData changes
  useEffect(() => {
    setPhoneVerified(userData.phone_verified);
  }, [userData.phone_verified]);

  const [editedValue, setEditedValue] = useState<UserDataType>(userData);
  const [hasPhoneOr2FAChanges, setHasPhoneOr2FAChanges] = useState(false);

  // Update editedValue when userData changes
  useEffect(() => {
    setEditedValue(userData);
    setTwoFaEnabled(userData.two_fa_enabled);
    setHasPhoneOr2FAChanges(false); // Reset changes when userData updates
  }, [userData]);

  // Track phone number changes
  useEffect(() => {
    if (phoneNumber !== userData.phone_number) {
      setHasPhoneOr2FAChanges(true);
    }
  }, [phoneNumber, userData.phone_number]);

  // Track 2FA changes
  useEffect(() => {
    if (twoFaEnabled !== userData.two_fa_enabled) {
      setHasPhoneOr2FAChanges(true);
    }
  }, [twoFaEnabled, userData.two_fa_enabled]);

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  const userFields: FieldConfig[] = [
    {
      name: 'name',
      label: 'Name',
      fieldType: 'text',
      editable: true,
    },
    {
      name: 'email',
      label: 'Email',
      fieldType: 'email',
      editable: true,
    },
    {
      name: 'password',
      label: 'Password',
      fieldType: 'text',
      value: '********',
      editable: true,
    },
    {
      name: 'phone_number',
      label: 'Phone Number',
      fieldType: 'text',
      editable: true,
      value: userData.phone_number || '',
      onClick: () => {
        setPhoneNumber(userData.phone_number || '');
        setIsEditing(true);
      },
      endAdornment: phoneVerified ? (
        <CheckCircleIcon color='primary' sx={{ ml: 1 }} />
      ) : null,
    },
    {
      name: 'fullAddress',
      label: 'Address',
      fieldType: 'text',
      editable: true,
    },
    {
      name: 'role',
      label: 'Role',
      fieldType: 'text',
      editable: false,
    },
    {
      name: 'division',
      label: 'Division',
      fieldType: 'text',
      editable: false,
    },
    {
      name: 'displayMarkets',
      label: 'Markets',
      fieldType: 'chip',
      editable: false,
      chipProps: {
        size: 'small',
        variant: 'outlined',
        color: 'primary',
        sx: {
          borderRadius: '16px',
          backgroundColor: 'transparent',
          fontFamily: 'theme.typography.fontFamily',
          '& .MuiChip-label': {
            px: 1,
          },
        },
      },
    },
  ];

  const handleEdit = () => {
    setEditedValue({ ...userData });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;

    const updatedUserData = {
      ...editedValue,
      first_name: editedValue.name.split(' ')[0],
      last_name: editedValue.name.split(' ')[1],
    };

    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/users/settings/edit/${user.id}`,
        {
          ...updatedUserData,
          currentUser: user,
        },
      );

      await checkAuth(); // Refresh user context
      showSnackbar('Settings updated successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating settings:', error);
      showSnackbar('Failed to update settings', 'error');
    }
  };

  const handlePhoneNumberChange = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/2fa/send-phone-verification`,
        { phoneNumber },
      );

      if (response.data.success) {
        setVerificationDialogOpen(true);
        showSnackbar('Verification code sent successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to send verification code', 'error');
    }
  };

  const handleVerificationButtonClick = async () => {
    try {
      // Verify phone number
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/2fa/verify-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber,
            code: verificationCode,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to verify phone number');
      }

      setVerificationDialogOpen(false);
      setVerificationCode('');
      showSnackbar('Phone number verified successfully', 'success');
      setPhoneVerified(true); // Set verified in local state
      // Refresh user data to get updated verification status
      await checkAuth();
    } catch (error: unknown) {
      console.error(
        'Error during verification:',
        error instanceof Error ? error.message : error,
      );
      showSnackbar(
        error instanceof Error
          ? error.message
          : 'Verification failed. Please try again.',
        'error',
      );
    }
  };

  const handleTwoFactorToggle = async () => {
    try {
      if (twoFaEnabled) {
        // When disabling 2FA, do it directly without any verification
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/2fa/disable`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to disable 2FA');
        }

        setTwoFaEnabled(false);
        showSnackbar('2FA has been disabled successfully', 'success');
      } else {
        // When enabling 2FA, check if phone is verified first
        if (!phoneVerified) {
          showSnackbar(
            'Please verify your phone number before enabling 2FA',
            'error',
          );
          return;
        }

        // Enable 2FA directly since phone is already verified
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/2fa/enable`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to enable 2FA');
        }

        setTwoFaEnabled(true);
        showSnackbar('2FA has been enabled successfully', 'success');
      }
    } catch (error: unknown) {
      console.error('Error toggling 2FA:', error);
      showSnackbar('Failed to toggle 2FA. Please try again.', 'error');
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordError({ current: '', new: '' });
      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/change-password`,
        {
          userId: user.id,
          currentPassword,
          newPassword,
        },
      );

      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      showSnackbar('Password updated successfully', 'success');
    } catch (error: unknown) {
      let errorMessage = 'Failed to update password';
      let errorField = ''; // Track which field caused the error

      // Check for Axios error with response data
      if (axios.isAxiosError(error) && error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
        const errorCode = error.response.data.code;

        // Determine which field is associated with the error
        if (errorCode === 'PASSWORD_COMPLEXITY_FAILURE') {
          errorField = 'new';
        } else if (
          errorMessage.toLowerCase().includes('current password is incorrect')
        ) {
          errorField = 'current';
        }

        // Don't log expected validation errors (like 400/401) as console errors
        if (![400, 401].includes(error.response.status)) {
          console.error('Password change error:', error.response.data);
        }
      } else {
        // Log unexpected errors
        console.error(
          'Password change error:',
          error instanceof Error ? error.message : error,
        );
      }

      // Update the passwordError state for the specific field
      setPasswordError({
        current: errorField === 'current' ? errorMessage : '',
        new: errorField === 'new' ? errorMessage : '',
      });
      showSnackbar(errorMessage, 'error'); // Show specific error in Snackbar
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info',
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const footerButtons = [
    {
      label: 'Cancel',
      onClick: () => {
        setIsEditing(false);
        setEditedValue({ ...userData });
        setPhoneNumber(userData.phone_number || '');
        setTwoFaEnabled(userData.two_fa_enabled);
        setHasPhoneOr2FAChanges(false);
      },
      variant: 'outlined' as const,
    },
    {
      label: 'Save Changes',
      onClick: handleSave,
      variant: 'contained' as const,
      disabled:
        JSON.stringify(editedValue) === JSON.stringify(userData) &&
        !hasPhoneOr2FAChanges,
    },
  ];

  // Move this above the return statement
  const VerificationDialog = (
    <Dialog
      open={verificationDialogOpen}
      onClose={() => {
        setVerificationDialogOpen(false);
        setVerificationCode('');
      }}
    >
      <DialogTitle>Verify Phone Number</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Enter the verification code sent to your phone number.
          </Typography>
          <TextField
            fullWidth
            label='Verification Code'
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            inputProps={{ maxLength: 6 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setVerificationDialogOpen(false);
            setVerificationCode('');
          }}
        >
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleVerificationButtonClick}
          disabled={!verificationCode}
        >
          Verify
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <DynamicForm fields={userFields} data={userData} onEdit={handleEdit} />

      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setPasswordError({ current: '', new: '' }); // Reset errors on close
        }}
      >
        <DialogTitle>Change Password</DialogTitle>
        <Box
          component='form'
          onSubmit={(e) => {
            e.preventDefault();
            handlePasswordChange();
          }}
        >
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label='Current Password'
                type='password'
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  // Clear error only for this field when user types
                  if (passwordError.current)
                    setPasswordError((prev) => ({ ...prev, current: '' }));
                }}
                error={!!passwordError.current} // Keep red outline logic
                helperText={' '} // Keep consistent spacing, but don't show error message
                // Remove FormHelperTextProps - helper text won't turn red
              />
              <TextField
                fullWidth
                label='New Password'
                type='password'
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  // Clear error only for this field when user types
                  if (passwordError.new)
                    setPasswordError((prev) => ({ ...prev, new: '' }));
                }}
                error={!!passwordError.new} // Keep red outline logic
                helperText={
                  'Must be at least 8 characters, include 1 uppercase letter, and 1 special character.'
                } // Always show requirements, updated from 7 to 8
                // Remove FormHelperTextProps - helper text won't turn red
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setPasswordDialogOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setPasswordError({ current: '', new: '' }); // Reset errors on cancel
              }}
            >
              Cancel
            </Button>
            <Button
              type='submit' // Make this button submit the form
              variant='contained'
              disabled={!currentPassword || !newPassword}
            >
              Submit
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <QualSidebar
        open={isEditing}
        onClose={() => {
          setIsEditing(false);
          setEditedValue({ ...userData });
        }}
        title='Edit User Settings'
        footerButtons={footerButtons}
      >
        <Box sx={{ p: 3 }}>
          <Stack spacing={4}>
            <Box>
              <Typography
                variant='subtitle2'
                color='primary'
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <PersonIcon fontSize='small' />
                Personal Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label='Name'
                  value={editedValue.name}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label='Email'
                  type='email'
                  value={editedValue.email}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </Stack>
            </Box>

            <Box>
              <Typography
                variant='subtitle2'
                color='primary'
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <SecurityIcon fontSize='small' />
                Security
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      fullWidth
                      label='Password'
                      value='********'
                      disabled
                      InputProps={{
                        startAdornment: (
                          <LockIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        ),
                      }}
                    />
                    <Button
                      variant='outlined'
                      onClick={() => setPasswordDialogOpen(true)}
                      sx={{ flexShrink: 0 }}
                    >
                      Change Password
                    </Button>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        fullWidth
                        label='Phone Number'
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          setPhoneVerified(false); // Reset verification status on change
                        }}
                        placeholder='Enter phone number'
                        InputProps={{
                          startAdornment: (
                            <ShieldIcon
                              sx={{ color: 'text.secondary', mr: 1 }}
                            />
                          ),
                          endAdornment: phoneVerified && (
                            <CheckCircleIcon color='primary' sx={{ ml: 1 }} />
                          ),
                        }}
                      />
                      {!phoneVerified && phoneNumber && (
                        <Button
                          variant='outlined'
                          onClick={handlePhoneNumberChange}
                          disabled={!phoneNumber}
                          sx={{ flexShrink: 0 }}
                        >
                          Verify
                        </Button>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        bgcolor: twoFaEnabled
                          ? 'secondary.light'
                          : 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <SecurityIcon
                          fontSize='small'
                          color={twoFaEnabled ? 'secondary' : 'action'}
                        />
                        Two-Factor Authentication
                      </Typography>
                      <Button
                        variant={twoFaEnabled ? 'contained' : 'outlined'}
                        color={twoFaEnabled ? 'error' : 'secondary'}
                        onClick={handleTwoFactorToggle}
                        disabled={!phoneVerified}
                        size='small'
                      >
                        {twoFaEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Box>
              <Typography
                variant='subtitle2'
                color='primary'
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <LocationOnIcon fontSize='small' />
                Address
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label='Street Address'
                  value={editedValue.address}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label='City'
                  value={editedValue.city}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label='State'
                  value={editedValue.state_code}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      state_code: e.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label='ZIP Code'
                  value={editedValue.zip}
                  onChange={(e) =>
                    setEditedValue((prev) => ({
                      ...prev,
                      zip: e.target.value,
                    }))
                  }
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
      </QualSidebar>

      {VerificationDialog}
    </Box>
  );
};
