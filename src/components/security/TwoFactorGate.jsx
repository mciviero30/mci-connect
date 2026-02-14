import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TwoFactorVerification from './TwoFactorVerification';

export default function TwoFactorGate({ children, user }) {
  const [verified, setVerified] = useState(false);

  // Check if 2FA is required for this user
  const { data: twoFactorConfig } = useQuery({
    queryKey: ['2fa-config', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const configs = await base44.entities.TwoFactorAuth.filter({ user_id: user.id });
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!user,
  });

  // Check session verification
  useEffect(() => {
    const sessionVerified = sessionStorage.getItem('2fa_verified');
    const verifiedAt = sessionStorage.getItem('2fa_verified_at');
    
    if (sessionVerified === 'true' && verifiedAt) {
      const verifiedTime = new Date(verifiedAt);
      const now = new Date();
      const hoursSinceVerification = (now - verifiedTime) / (1000 * 60 * 60);
      
      // Session valid for 8 hours
      if (hoursSinceVerification < 8) {
        setVerified(true);
      } else {
        sessionStorage.removeItem('2fa_verified');
        sessionStorage.removeItem('2fa_verified_at');
      }
    }
  }, []);

  // If 2FA not enabled or already verified, show app
  if (!twoFactorConfig || !twoFactorConfig.enabled || verified) {
    return <>{children}</>;
  }

  // Show 2FA verification screen
  return (
    <TwoFactorVerification
      user={user}
      onVerified={() => setVerified(true)}
    />
  );
}