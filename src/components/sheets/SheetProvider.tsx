import React, { useCallback, useRef, useEffect, memo } from 'react';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks';
import { useUIStore } from '@/store';

interface SheetProviderProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
}

/** Reusable bottom sheet wrapper — all app sheets route through this */
export const SheetProvider = memo(function SheetProvider({
  children,
  snapPoints = ['50%', '85%'],
  onClose,
}: SheetProviderProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const activeSheet = useUIStore(s => s.activeSheet);
  const closeSheet = useUIStore(s => s.closeSheet);

  useEffect(() => {
    if (activeSheet) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [activeSheet]);

  const handleClose = useCallback(() => {
    closeSheet();
    onClose?.();
  }, [closeSheet, onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    [],
  );

  if (!activeSheet) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onClose={handleClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle, width: 40 }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
});
