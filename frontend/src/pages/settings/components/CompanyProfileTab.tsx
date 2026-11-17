import React, { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Button,
  SimpleGrid,
  Box,
  LoadingOverlay,
  TextInput,
  Divider,
  ThemeIcon,
  useComputedColorScheme,
  FileButton,
  Select,
  Loader,
  Badge,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBuildingSkyscraper,
  IconCheck,
  IconReceipt2,
  IconCreditCard,
  IconQrcode,
  IconUpload,
  IconTrash,
  IconMail,
  IconPhone,
  IconWorld,
  IconDeviceFloppy,
  IconRefresh,
  IconBuilding,
  IconMapPin,
  IconSignature,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import QRCode from 'qrcode';
import { CompanyProfile } from '../../../types/settings';
import { settingsService } from '../../../services/settingsService';
import { APP_LOGO_URL } from '../../../config/env';

// GST state code mapping for Indian states
const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export const CompanyProfileTab: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState<string>('');
  const [fetchingPin, setFetchingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Box validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CompanyProfile>({
    companyName: '',
    legalName: '',
    tagline: '',
    companyGst: '',
    gstNumber: '',
    companyPan: '',
    panNumber: '',
    cinNumber: '',
    companyAddress: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    placeOfSupply: '',
    companyPhone: '',
    phone: '',
    companyEmail: '',
    email: '',
    supportEmail: '',
    companyWebsite: '',
    website: '',
    companyLogoUrl: '',
    logoUrl: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: '',
    accountType: 'Current Account',
    upiId: '',
    authorizedSignatory: '',
    signatoryDesignation: '',
    signatureUrl: '',
  });

  // Load Profile from API
  const loadProfile = async () => {
    setLoading(true);
    setErrors({});
    try {
      const res = await settingsService.getCompanyProfile();
      if (res.success && res.data) {
        setFormData({
          companyName: res.data.companyName || '',
          legalName: res.data.legalName || '',
          tagline: res.data.tagline || '',
          companyGst: res.data.companyGst || res.data.gstNumber || '',
          gstNumber: res.data.companyGst || res.data.gstNumber || '',
          companyPan: res.data.companyPan || res.data.panNumber || '',
          panNumber: res.data.companyPan || res.data.panNumber || '',
          cinNumber: res.data.cinNumber || '',
          companyAddress: res.data.companyAddress || res.data.address || '',
          address: res.data.companyAddress || res.data.address || '',
          city: res.data.city || '',
          state: res.data.state || '',
          zip: res.data.zip || '',
          country: res.data.country || '',
          placeOfSupply: res.data.placeOfSupply || '',
          companyPhone: res.data.companyPhone || res.data.phone || '',
          phone: res.data.companyPhone || res.data.phone || '',
          companyEmail: res.data.companyEmail || res.data.email || '',
          email: res.data.companyEmail || res.data.email || '',
          supportEmail: res.data.supportEmail || '',
          companyWebsite: res.data.companyWebsite || res.data.website || '',
          website: res.data.companyWebsite || res.data.website || '',
          companyLogoUrl: res.data.companyLogoUrl || res.data.logoUrl || '',
          logoUrl: res.data.companyLogoUrl || res.data.logoUrl || '',
          bankName: res.data.bankName || '',
          accountNumber: res.data.accountNumber || '',
          accountHolderName: res.data.accountHolderName || '',
          ifscCode: res.data.ifscCode || '',
          branchName: res.data.branchName || '',
          accountType: res.data.accountType || 'Current Account',
          upiId: res.data.upiId || '',
          authorizedSignatory: res.data.authorizedSignatory || 'Santhosh C',
          signatoryDesignation: res.data.signatoryDesignation || 'Managing Director',
          signatureUrl: res.data.signatureUrl || '',
        });
        if (res.data.zip && res.data.zip.length === 6) {
          setPinSuccess(true);
        }
      }
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to load company profile',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Live QR Code Generation for UPI ID
  useEffect(() => {
    const upi = formData.upiId?.trim();
    if (!upi) {
      setQrPreview('');
      return;
    }

    const payee = formData.accountHolderName?.trim() || formData.companyName?.trim() || 'Payee';
    const uri = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(payee)}&cu=INR`;

    QRCode.toDataURL(uri, {
      margin: 1,
      width: 120,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrPreview(url))
      .catch(() => setQrPreview(''));
  }, [formData.upiId, formData.accountHolderName, formData.companyName]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Sync aliases
      if (field === 'companyGst' || field === 'gstNumber') {
        next.companyGst = value;
        next.gstNumber = value;
      }
      if (field === 'companyPan' || field === 'panNumber') {
        next.companyPan = value;
        next.panNumber = value;
      }
      if (field === 'companyEmail' || field === 'email') {
        next.companyEmail = value;
        next.email = value;
      }
      if (field === 'companyPhone' || field === 'phone') {
        next.companyPhone = value;
        next.phone = value;
      }
      if (field === 'companyAddress' || field === 'address') {
        next.companyAddress = value;
        next.address = value;
      }
      if (field === 'companyWebsite' || field === 'website') {
        next.companyWebsite = value;
        next.website = value;
      }
      if (field === 'companyLogoUrl' || field === 'logoUrl') {
        next.companyLogoUrl = value;
        next.logoUrl = value;
      }

      return next;
    });
  };

  // GSTIN Change & Validation
  const handleGstChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15);
    setFormData((prev) => {
      const next = { ...prev, companyGst: clean, gstNumber: clean };
      if (clean.length >= 12) {
        const derivedPan = clean.substring(2, 12);
        next.companyPan = derivedPan;
        next.panNumber = derivedPan;
      }
      const stateCode = clean.slice(0, 2);
      if (GST_STATE_CODES[stateCode] && !prev.placeOfSupply) {
        next.placeOfSupply = GST_STATE_CODES[stateCode];
      }
      return next;
    });

    if (clean.length === 15) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(clean)) {
        setErrors((prev) => ({ ...prev, companyGst: 'Invalid 15-digit GSTIN format (e.g. 33AAAAA0000A1Z5)' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.companyGst;
          return copy;
        });
      }
    } else if (clean.length > 0) {
      setErrors((prev) => ({ ...prev, companyGst: 'GSTIN must be exactly 15 characters' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.companyGst;
        return copy;
      });
    }
  };

  // PAN Change & Validation
  const handlePanChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    setFormData((prev) => ({ ...prev, companyPan: clean, panNumber: clean }));

    if (clean.length === 10) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(clean)) {
        setErrors((prev) => ({ ...prev, companyPan: 'Invalid PAN (Format: 5 letters, 4 digits, 1 letter)' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.companyPan;
          return copy;
        });
      }
    } else if (clean.length > 0) {
      setErrors((prev) => ({ ...prev, companyPan: 'PAN must be exactly 10 characters' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.companyPan;
        return copy;
      });
    }
  };

  // CIN Change & Validation
  const handleCinChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 21);
    handleChange('cinNumber', clean);

    if (clean.length === 21) {
      const cinRegex = /^[LUu]{1}[0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
      if (!cinRegex.test(clean)) {
        setErrors((prev) => ({ ...prev, cinNumber: 'Invalid 21-character CIN format' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.cinNumber;
          return copy;
        });
      }
    } else if (clean.length > 0) {
      setErrors((prev) => ({ ...prev, cinNumber: 'CIN must be 21 characters' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cinNumber;
        return copy;
      });
    }
  };

  // Pincode Change & Validation with Auto-fetch
  const handlePincodeChange = async (value: string) => {
    const cleanPin = value.replace(/\D/g, '').slice(0, 6);
    handleChange('zip', cleanPin);

    if (cleanPin.length === 6) {
      setFetchingPin(true);
      setPinSuccess(false);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
        const data = await response.json();

        if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Block || po.Division || po.Name || '';
          const detectedState = po.State || '';
          const detectedCountry = po.Country || 'India';

          setFormData((prev) => ({
            ...prev,
            zip: cleanPin,
            city: detectedCity,
            state: detectedState,
            country: detectedCountry,
            placeOfSupply: prev.placeOfSupply && prev.placeOfSupply.trim() ? prev.placeOfSupply : detectedState,
          }));

          setPinSuccess(true);
          setErrors((prev) => {
            const copy = { ...prev };
            delete copy.zip;
            return copy;
          });
          notifications.show({
            color: 'teal',
            title: 'Location Verified & Auto-Fetched',
            message: `${detectedCity}, ${detectedState}, ${detectedCountry}`,
            icon: <IconCheck size={16} />,
          });
        } else {
          setPinSuccess(false);
          setErrors((prev) => ({ ...prev, zip: 'Location not found for this PIN code' }));
        }
      } catch (err) {
        console.warn('Pincode fetch error:', err);
        setPinSuccess(false);
      } finally {
        setFetchingPin(false);
      }
    } else if (cleanPin.length > 0) {
      setPinSuccess(false);
      setErrors((prev) => ({ ...prev, zip: 'PIN Code must be 6 digits' }));
    } else {
      setPinSuccess(false);
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.zip;
        return copy;
      });
    }
  };

  // Email Validation
  const handleEmailChange = (val: string) => {
    handleChange('companyEmail', val);
    if (val.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(val.trim())) {
        setErrors((prev) => ({ ...prev, companyEmail: 'Please enter a valid email address' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.companyEmail;
          return copy;
        });
      }
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.companyEmail;
        return copy;
      });
    }
  };

  // Phone Validation
  const handlePhoneChange = (val: string) => {
    handleChange('companyPhone', val);
    const digits = val.replace(/\D/g, '');
    if (val.trim() && (digits.length < 10 || digits.length > 13)) {
      setErrors((prev) => ({ ...prev, companyPhone: 'Please enter a valid 10-digit phone number' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.companyPhone;
        return copy;
      });
    }
  };

  // Website Validation
  const handleWebsiteChange = (val: string) => {
    handleChange('companyWebsite', val);
    if (val.trim()) {
      const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (!urlRegex.test(val.trim())) {
        setErrors((prev) => ({ ...prev, companyWebsite: 'Please enter a valid URL (e.g. https://company.com)' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.companyWebsite;
          return copy;
        });
      }
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.companyWebsite;
        return copy;
      });
    }
  };

  // Bank Account Number Validation
  const handleAccountChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 18);
    handleChange('accountNumber', clean);

    if (clean.length > 0 && clean.length < 9) {
      setErrors((prev) => ({ ...prev, accountNumber: 'Account number must be 9 to 18 digits' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.accountNumber;
        return copy;
      });
    }
  };

  // IFSC Code Validation
  const handleIfscChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
    handleChange('ifscCode', clean);

    if (clean.length === 11) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(clean)) {
        setErrors((prev) => ({ ...prev, ifscCode: 'Invalid IFSC (e.g. HDFC0001234 - 5th char must be 0)' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.ifscCode;
          return copy;
        });
      }
    } else if (clean.length > 0) {
      setErrors((prev) => ({ ...prev, ifscCode: 'IFSC must be 11 characters' }));
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.ifscCode;
        return copy;
      });
    }
  };

  // UPI ID Validation
  const handleUpiChange = (val: string) => {
    handleChange('upiId', val);
    if (val.trim()) {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(val.trim())) {
        setErrors((prev) => ({ ...prev, upiId: 'Invalid UPI ID (e.g. name@okhdfcbank)' }));
      } else {
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.upiId;
          return copy;
        });
      }
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.upiId;
        return copy;
      });
    }
  };

  // Full Form Validation before Save
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Company Name Required
    if (!formData.companyName || formData.companyName.trim().length < 2) {
      newErrors.companyName = 'Company name is required (min 2 characters)';
    }

    // 2. GSTIN
    if (formData.companyGst && formData.companyGst.trim()) {
      const cleanGst = formData.companyGst.trim().toUpperCase();
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (cleanGst.length !== 15 || !gstRegex.test(cleanGst)) {
        newErrors.companyGst = 'Invalid 15-digit GSTIN (e.g. 33AAAAA0000A1Z5)';
      }
    }

    // 3. PAN
    if (formData.companyPan && formData.companyPan.trim()) {
      const cleanPan = formData.companyPan.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (cleanPan.length !== 10 || !panRegex.test(cleanPan)) {
        newErrors.companyPan = 'Invalid 10-character PAN (e.g. AAAAA0000A)';
      }
    }

    // 4. CIN
    if (formData.cinNumber && formData.cinNumber.trim()) {
      const cleanCin = formData.cinNumber.trim().toUpperCase();
      const cinRegex = /^[LUu]{1}[0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/;
      if (cleanCin.length !== 21 || !cinRegex.test(cleanCin)) {
        newErrors.cinNumber = 'Invalid 21-character CIN format';
      }
    }

    // 5. PIN Code
    if (formData.zip && formData.zip.trim()) {
      const cleanZip = formData.zip.trim();
      if (!/^\d{6}$/.test(cleanZip)) {
        newErrors.zip = 'PIN Code must be exactly 6 digits';
      }
    }

    // 6. Email
    if (formData.companyEmail && formData.companyEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(formData.companyEmail.trim())) {
        newErrors.companyEmail = 'Please enter a valid email address';
      }
    }

    // 7. Phone
    if (formData.companyPhone && formData.companyPhone.trim()) {
      const digits = formData.companyPhone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        newErrors.companyPhone = 'Please enter a valid 10-digit phone number';
      }
    }

    // 8. Website
    if (formData.companyWebsite && formData.companyWebsite.trim()) {
      const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (!urlRegex.test(formData.companyWebsite.trim())) {
        newErrors.companyWebsite = 'Please enter a valid URL (e.g. https://company.com)';
      }
    }

    // 9. Account Number
    if (formData.accountNumber && formData.accountNumber.trim()) {
      const cleanAcc = formData.accountNumber.trim();
      if (!/^\d{9,18}$/.test(cleanAcc)) {
        newErrors.accountNumber = 'Account number must be 9 to 18 digits';
      }
    }

    // 10. IFSC
    if (formData.ifscCode && formData.ifscCode.trim()) {
      const cleanIfsc = formData.ifscCode.trim().toUpperCase();
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (cleanIfsc.length !== 11 || !ifscRegex.test(cleanIfsc)) {
        newErrors.ifscCode = 'Invalid IFSC code (e.g. HDFC0001234)';
      }
    }

    // 11. UPI ID
    if (formData.upiId && formData.upiId.trim()) {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(formData.upiId.trim())) {
        newErrors.upiId = 'Invalid UPI ID format (e.g. name@bank)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Logo File Upload
  const handleLogoUpload = (file: File | null) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Please choose a logo image under 2MB.',
        color: 'orange',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        handleChange('companyLogoUrl', dataUrl);
        notifications.show({
          title: 'Logo Selected',
          message: 'Logo updated! Click Save Changes to apply to invoices.',
          color: 'teal',
          icon: <IconCheck size={16} />,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    // Validate all boxes before saving
    const isValid = validateForm();
    if (!isValid) {
      notifications.show({
        title: 'Validation Errors',
        message: 'Please resolve the highlighted box validation errors before saving.',
        color: 'red',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<CompanyProfile> = {
        ...formData,
        address: formData.companyAddress || formData.address,
        companyAddress: formData.companyAddress || formData.address,
        gstNumber: formData.companyGst || formData.gstNumber,
        companyGst: formData.companyGst || formData.gstNumber,
        panNumber: formData.companyPan || formData.panNumber,
        companyPan: formData.companyPan || formData.panNumber,
        email: formData.companyEmail || formData.email,
        companyEmail: formData.companyEmail || formData.email,
        phone: formData.companyPhone || formData.phone,
        companyPhone: formData.companyPhone || formData.phone,
        website: formData.companyWebsite || formData.website,
        companyWebsite: formData.companyWebsite || formData.website,
        logoUrl: formData.companyLogoUrl || formData.logoUrl,
        companyLogoUrl: formData.companyLogoUrl || formData.logoUrl,
      };

      const res = await settingsService.updateCompanyProfile(payload);
      if (res.success) {
        notifications.show({
          title: 'Saved Successfully',
          message: 'Company profile and tax configuration updated.',
          color: 'teal',
          icon: <IconCheck size={18} />,
        });
      }
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Failed to update company profile',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #EAECF0',
    borderRadius: '16px',
    boxShadow: isDark ? 'none' : '0 1px 3px rgba(16, 24, 40, 0.05)',
  };

  return (
    <Box pos="relative" style={{ maxWidth: 940, width: '100%', paddingBottom: 24 }}>
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ blur: 1 }} />

      {/* 1. Header with Page Title and Save Action */}
      <Group justify="space-between" align="center" mb="lg" wrap="wrap" gap="sm">
        <Box style={{ minWidth: 0 }}>
          <Group gap="xs" align="center">
            <Text
              fw={800}
              size={isMobile ? '18px' : '20px'}
              style={{ color: isDark ? '#F8FAFC' : '#0F172A', letterSpacing: '-0.01em' }}
            >
              Company Profile & GST Configuration
            </Text>
            <Badge size="sm" variant="light" color="indigo" radius="sm">
              Tax Compliant
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            Manage business legal identity, GSTIN, registered office, bank accounts & invoice signatory
          </Text>
        </Box>

        <Group gap="xs">
          <Button
            variant="default"
            size="sm"
            radius="md"
            leftSection={<IconRefresh size={15} />}
            onClick={loadProfile}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            color="indigo"
            size="sm"
            radius="md"
            leftSection={<IconDeviceFloppy size={16} />}
            loading={saving}
            onClick={handleSave}
            style={{ fontWeight: 650 }}
          >
            Save Changes
          </Button>
        </Group>
      </Group>

      <Stack gap="lg">
        {/* 2. Brand Identity & Logo Card */}
        <Paper p={isMobile ? 'md' : 'xl'} style={cardStyle}>
          <Group gap="sm" mb="md" align="center">
            <ThemeIcon color="violet" variant="light" size="md" radius="md">
              <IconBuildingSkyscraper size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" c={isDark ? '#F8FAFC' : '#0F172A'}>
                Company Identity & Logo
              </Text>
              <Text size="11px" c="dimmed">
                Primary brand info printed on customer invoices, proposals, and contracts
              </Text>
            </div>
          </Group>

          <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'} />

          <Group gap="xl" align="flex-start" wrap={isMobile ? 'wrap' : 'nowrap'}>
            {/* Logo Preview */}
            <Box style={{ textAlign: 'center' }}>
              <Box
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 12,
                  border: isDark ? '2px dashed rgba(255,255,255,0.15)' : '2px dashed #CBD5E1',
                  background: isDark ? '#1E293B' : '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  marginBottom: 8,
                }}
              >
                {formData.companyLogoUrl ? (
                  <img
                    src={formData.companyLogoUrl}
                    alt="Logo"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      if ((e.target as HTMLImageElement).src !== APP_LOGO_URL) {
                        (e.target as HTMLImageElement).src = APP_LOGO_URL;
                      }
                    }}
                  />
                ) : (
                  <IconBuilding size={32} color={isDark ? '#94A3B8' : '#64748B'} />
                )}
              </Box>

              <Group gap={4} justify="center">
                <FileButton onChange={handleLogoUpload} accept="image/png,image/jpeg,image/svg+xml,image/webp">
                  {(props) => (
                    <Button {...props} size="xs" variant="light" color="indigo" leftSection={<IconUpload size={13} />}>
                      Upload
                    </Button>
                  )}
                </FileButton>
                {formData.companyLogoUrl && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => handleChange('companyLogoUrl', '')}
                  >
                    <IconTrash size={13} />
                  </Button>
                )}
              </Group>
            </Box>

            {/* Brand Fields */}
            <Box style={{ flex: 1, minWidth: 0, width: '100%' }}>
              <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                <TextInput
                  label="Company / Business Name"
                  placeholder="e.g. OneAssist Technologies"
                  value={formData.companyName}
                  onChange={(e) => {
                    handleChange('companyName', e.target.value);
                    if (e.target.value.trim().length >= 2) {
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.companyName;
                        return copy;
                      });
                    }
                  }}
                  required
                  error={errors.companyName}
                  rightSection={
                    !errors.companyName && formData.companyName.trim().length >= 2 ? (
                      <IconCheck size={16} color="#10B981" />
                    ) : null
                  }
                />
                <TextInput
                  label="Legal / Registered Entity Name"
                  placeholder="e.g. OneAssist Technologies Private Limited"
                  value={formData.legalName || ''}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                />
              </SimpleGrid>

              <TextInput
                mt="md"
                label="Brand Tagline / Slogan"
                placeholder="e.g. Enterprise IT Sales & Operations CRM"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
              />
            </Box>
          </Group>
        </Paper>

        {/* 3. GST, PAN & Registered Address Card */}
        <Paper p={isMobile ? 'md' : 'xl'} style={cardStyle}>
          <Group gap="sm" mb="md" align="center">
            <ThemeIcon color="teal" variant="light" size="md" radius="md">
              <IconReceipt2 size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" c={isDark ? '#F8FAFC' : '#0F172A'}>
                GSTIN, PAN & Registered Office Address
              </Text>
              <Text size="11px" c="dimmed">
                Tax registration numbers and legal corporate communication address
              </Text>
            </div>
          </Group>

          <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'} />

          <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
            <TextInput
              label="GSTIN (15 Characters)"
              placeholder="e.g. 33AAAAA0000A1Z5"
              value={formData.companyGst || ''}
              onChange={(e) => handleGstChange(e.target.value)}
              maxLength={15}
              error={errors.companyGst}
              rightSection={
                !errors.companyGst && formData.companyGst?.length === 15 ? (
                  <IconCheck size={16} color="#10B981" />
                ) : null
              }
            />

            <TextInput
              label="PAN Number (10 Characters)"
              placeholder="e.g. AAAAA0000A"
              value={formData.companyPan || ''}
              onChange={(e) => handlePanChange(e.target.value)}
              maxLength={10}
              error={errors.companyPan}
              rightSection={
                !errors.companyPan && formData.companyPan?.length === 10 ? (
                  <IconCheck size={16} color="#10B981" />
                ) : null
              }
            />

            <TextInput
              label="CIN Number (21 Characters)"
              placeholder="e.g. U72900TN2024PTC123456"
              value={formData.cinNumber || ''}
              onChange={(e) => handleCinChange(e.target.value)}
              maxLength={21}
              error={errors.cinNumber}
              rightSection={
                !errors.cinNumber && formData.cinNumber?.length === 21 ? (
                  <IconCheck size={16} color="#10B981" />
                ) : null
              }
            />

            <TextInput
              label="Place of Supply / State"
              placeholder="e.g. Tamil Nadu"
              value={formData.placeOfSupply || ''}
              onChange={(e) => handleChange('placeOfSupply', e.target.value)}
            />
          </SimpleGrid>

          <TextInput
            mt="md"
            label="Registered Office Address"
            placeholder="Enter Street Address, Building, Floor"
            value={formData.companyAddress || ''}
            onChange={(e) => handleChange('companyAddress', e.target.value)}
          />

          {/* 4-column Address Grid: Perfectly aligned baseline with PIN Code -> City -> State -> Country */}
          <Box mt="md">
            <SimpleGrid cols={isMobile ? 1 : 4} spacing="md">
              <TextInput
                label="PIN Code"
                placeholder="e.g. 600001"
                value={formData.zip || ''}
                onChange={(e) => handlePincodeChange(e.target.value)}
                maxLength={6}
                leftSection={<IconMapPin size={15} color="#6366F1" />}
                rightSection={
                  fetchingPin ? (
                    <Loader size={14} color="indigo" />
                  ) : pinSuccess ? (
                    <IconCheck size={16} color="#10B981" />
                  ) : null
                }
                error={errors.zip}
              />
              <TextInput
                label="City"
                placeholder="City"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                error={errors.city}
              />
              <TextInput
                label="State"
                placeholder="State"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                error={errors.state}
              />
              <TextInput
                label="Country"
                placeholder="Country"
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                error={errors.country}
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt={6} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconCheck size={12} color="#10B981" /> Enter 6-digit PIN code to auto-fetch City, State & Country
            </Text>
          </Box>

          <SimpleGrid cols={isMobile ? 1 : 3} spacing="md" mt="md">
            <TextInput
              label="Billing Email"
              placeholder="billing@company.com"
              leftSection={<IconMail size={15} />}
              value={formData.companyEmail || ''}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={errors.companyEmail}
              rightSection={
                !errors.companyEmail && formData.companyEmail?.includes('@') ? (
                  <IconCheck size={16} color="#10B981" />
                ) : null
              }
            />
            <TextInput
              label="Phone Number"
              placeholder="+91 98765 43210"
              leftSection={<IconPhone size={15} />}
              value={formData.companyPhone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={errors.companyPhone}
              rightSection={
                !errors.companyPhone && formData.companyPhone?.replace(/\D/g, '').length === 10 ? (
                  <IconCheck size={16} color="#10B981" />
                ) : null
              }
            />
            <TextInput
              label="Website"
              placeholder="https://company.com"
              leftSection={<IconWorld size={15} />}
              value={formData.companyWebsite || ''}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              error={errors.companyWebsite}
            />
          </SimpleGrid>
        </Paper>

        {/* 4. Bank & Payment Details Card */}
        <Paper p={isMobile ? 'md' : 'xl'} style={cardStyle}>
          <Group gap="sm" mb="md" align="center">
            <ThemeIcon color="indigo" variant="light" size="md" radius="md">
              <IconCreditCard size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" c={isDark ? '#F8FAFC' : '#0F172A'}>
                Bank & Payment Details
              </Text>
              <Text size="11px" c="dimmed">
                Settlement bank details and instant UPI QR printed on customer tax invoices
              </Text>
            </div>
          </Group>

          <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'} />

          <Group align="flex-start" gap="xl" wrap={isMobile ? 'wrap' : 'nowrap'}>
            {/* Left Bank Fields */}
            <Box style={{ flex: 1, minWidth: 0, width: '100%' }}>
              <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                <TextInput
                  label="Account Holder / Beneficiary Name"
                  placeholder="e.g. OneAssist Technologies"
                  value={formData.accountHolderName || ''}
                  onChange={(e) => handleChange('accountHolderName', e.target.value)}
                />

                <TextInput
                  label="Bank Name"
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  value={formData.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                />

                <TextInput
                  label="Account Number (9-18 Digits)"
                  placeholder="Enter Account Number"
                  value={formData.accountNumber || ''}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  maxLength={18}
                  error={errors.accountNumber}
                  rightSection={
                    !errors.accountNumber && (formData.accountNumber?.length || 0) >= 9 ? (
                      <IconCheck size={16} color="#10B981" />
                    ) : null
                  }
                />

                <TextInput
                  label="IFSC Code (11 Characters)"
                  placeholder="e.g. HDFC0001234"
                  value={formData.ifscCode || ''}
                  onChange={(e) => handleIfscChange(e.target.value)}
                  maxLength={11}
                  error={errors.ifscCode}
                  rightSection={
                    !errors.ifscCode && formData.ifscCode?.length === 11 ? (
                      <IconCheck size={16} color="#10B981" />
                    ) : null
                  }
                />

                <TextInput
                  label="Branch Name"
                  placeholder="Enter Branch Name"
                  value={formData.branchName || ''}
                  onChange={(e) => handleChange('branchName', e.target.value)}
                />

                <Select
                  label="Account Type"
                  value={formData.accountType || 'Current Account'}
                  onChange={(val) => handleChange('accountType', val || 'Current Account')}
                  data={['Current Account', 'Savings Account', 'Cash Credit (CC)', 'Overdraft (OD)']}
                />
              </SimpleGrid>

              <TextInput
                mt="md"
                label="UPI ID / VPA (Optional)"
                placeholder="e.g. name@okhdfcbank"
                value={formData.upiId || ''}
                onChange={(e) => handleUpiChange(e.target.value)}
                error={errors.upiId}
                rightSection={
                  !errors.upiId && formData.upiId?.includes('@') ? (
                    <IconCheck size={16} color="#10B981" />
                  ) : null
                }
              />
            </Box>

            {/* Right: Live Dynamic UPI QR Code Preview */}
            {formData.upiId ? (
              <Box
                style={{
                  width: isMobile ? '100%' : 160,
                  flexShrink: 0,
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: 12,
                  background: isDark ? '#1E293B' : '#F8FAFC',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                }}
              >
                <Group justify="center" gap={4} mb={6}>
                  <IconQrcode size={15} color="#6D28D9" />
                  <Text size="11px" fw={700} c={isDark ? '#E2E8F0' : '#1E293B'}>
                    UPI QR Preview
                  </Text>
                </Group>

                {qrPreview ? (
                  <img
                    src={qrPreview}
                    alt="UPI QR Preview"
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      padding: 2,
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                ) : null}

                <Text size="10px" fw={600} c="#6D28D9" mt={6} truncate>
                  {formData.upiId}
                </Text>
              </Box>
            ) : null}
          </Group>
        </Paper>

        {/* 5. Authorized Signatory & Digital Stamp Card */}
        <Paper p={isMobile ? 'md' : 'xl'} style={cardStyle}>
          <Group gap="sm" mb="md" align="center">
            <ThemeIcon color="violet" variant="light" size="md" radius="md">
              <IconSignature size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" c={isDark ? '#F8FAFC' : '#0F172A'}>
                Authorized Signatory & Digital Seal / Stamp
              </Text>
              <Text size="11px" c="dimmed">
                Official signatory details and signature/stamp automatically printed on all GST tax invoices & contracts
              </Text>
            </div>
          </Group>

          <Divider mb="lg" color={isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'} />

          <Group gap="xl" align="flex-start" wrap={isMobile ? 'wrap' : 'nowrap'}>
            {/* Signature Preview & Upload */}
            <Box style={{ textAlign: 'center' }}>
              <Box
                style={{
                  width: 140,
                  height: 90,
                  borderRadius: 12,
                  border: isDark ? '2px dashed rgba(255,255,255,0.15)' : '2px dashed #CBD5E1',
                  background: isDark ? '#1E293B' : '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  marginBottom: 8,
                }}
              >
                {formData.signatureUrl ? (
                  <img
                    src={formData.signatureUrl}
                    alt="Signature"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Stack align="center" gap={4}>
                    <IconSignature size={28} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text size="10px" c="dimmed">No Signature</Text>
                  </Stack>
                )}
              </Box>

              <Group gap={4} justify="center">
                <FileButton
                  onChange={(file) => {
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      handleChange('signatureUrl', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                >
                  {(props) => (
                    <Button {...props} size="xs" variant="light" color="violet" leftSection={<IconUpload size={13} />}>
                      Upload Stamp / Sign
                    </Button>
                  )}
                </FileButton>
                {formData.signatureUrl && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => handleChange('signatureUrl', '')}
                  >
                    <IconTrash size={13} />
                  </Button>
                )}
              </Group>
            </Box>

            {/* Signatory Text Fields */}
            <Box style={{ flex: 1, minWidth: 0, width: '100%' }}>
              <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
                <TextInput
                  label="Authorized Signatory Name"
                  placeholder="e.g. Santhosh C"
                  value={formData.authorizedSignatory || ''}
                  onChange={(e) => handleChange('authorizedSignatory', e.target.value)}
                  description="Full legal name of the person authorized to sign invoices"
                />

                <TextInput
                  label="Signatory Title / Designation"
                  placeholder="e.g. Managing Director / Partner"
                  value={formData.signatoryDesignation || ''}
                  onChange={(e) => handleChange('signatoryDesignation', e.target.value)}
                  description="Official corporate designation"
                />
              </SimpleGrid>
            </Box>
          </Group>
        </Paper>

        {/* Bottom Save Action Bar */}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            size="md"
            radius="md"
            onClick={loadProfile}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            color="indigo"
            size="md"
            radius="md"
            leftSection={<IconDeviceFloppy size={18} />}
            loading={saving}
            onClick={handleSave}
            style={{ fontWeight: 700 }}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

export default CompanyProfileTab;
