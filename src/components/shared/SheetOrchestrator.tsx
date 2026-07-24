import React, { memo, useCallback } from 'react';
import { useUIStore, useAuthStore } from '@/store';
import { SheetProvider } from '../sheets/SheetProvider';
import { AuthSheet } from '../sheets/AuthSheet';
import { RideDetailsSheet } from '../sheets/RideDetailsSheet';
import { PersonSheet } from '../sheets/PersonSheet';
import { PaymentSheet } from '../sheets/PaymentSheet';
import { ChatSheet } from '../sheets/ChatSheet';
import { AlertDetailSheet } from '../sheets/AlertDetailSheet';

/** Central sheet orchestrator — renders the correct sheet based on global state */
export const SheetOrchestrator = memo(function SheetOrchestrator() {
  const activeSheet = useUIStore(s => s.activeSheet);
  const payload = useUIStore(s => s.sheetPayload);
  const closeSheet = useUIStore(s => s.closeSheet);

  const handleAuthSuccess = useCallback(() => {
    const returnAction = (payload as any)?.returnAction;
    closeSheet();
    returnAction?.();
  }, [payload, closeSheet]);

  if (!activeSheet) return null;

  const snapPoints =
    activeSheet === 'ride_details'
      ? ['92%']
      : activeSheet === 'request_details'
      ? ['92%']
      : activeSheet === 'alert_details'
      ? ['92%']
      : activeSheet === 'chat'
      ? ['70%', '95%']
      : activeSheet === 'auth'
      ? ['65%', '90%']
      : ['50%', '85%'];

  return (
    <SheetProvider snapPoints={snapPoints}>
      {activeSheet === 'auth' && (
        <AuthSheet onSuccess={handleAuthSuccess} />
      )}
      {activeSheet === 'ride_details' && payload && (
        <RideDetailsSheet
          item={(payload as any).trip}
          variant="ride"
        />
      )}
      {activeSheet === 'request_details' && payload && (
        <RideDetailsSheet
          item={(payload as any).request}
          variant="request"
        />
      )}
      {activeSheet === 'person' && payload && (
        <PersonSheet user={(payload as any).user} />
      )}
      {activeSheet === 'payment' && payload && (
        <PaymentSheet
          booking={(payload as any).booking}
          onPay={async () => false}
          onClose={closeSheet}
        />
      )}
      {activeSheet === 'chat' && payload && (
        <ChatSheet conversationId={(payload as any).conversationId} />
      )}
      {activeSheet === 'alert_details' && payload && (
        <AlertDetailSheet alert={(payload as any).alert} />
      )}
    </SheetProvider>
  );
});
