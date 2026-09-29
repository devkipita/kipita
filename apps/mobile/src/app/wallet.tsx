import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  canWithdraw,
  formatKes,
  isValidTopupAmount,
  movesBalance,
  txnLabel,
  txnSignedAmount,
  EMPTY_WALLET_SUMMARY,
  MAX_TOPUP,
  MIN_TOPUP,
  MIN_WITHDRAWAL,
  type WalletSummary,
  type WalletTransaction,
  type WalletTxnType,
} from "@kipita/shared";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { Button } from "@/components/core/Button";
import { TextInput } from "@/components/forms/TextInput";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useTheme, useSafeBack, useAppMode } from "@/hooks";
import { useAuthStore } from "@/store";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius } from "@/theme";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  fetchWithdrawals,
  pollTopupStatus,
  requestWithdrawal,
  startTopup,
} from "@/lib/api/wallet";
import type { IconName } from "@/components/core/Icon";

const TOPUP_PRESETS = [200, 500, 1000, 2500];

const TXN_ICON: Record<WalletTxnType, IconName> = {
  topup: "add-circle-outline",
  payout: "trending-up-outline",
  refund: "arrow-down-circle-outline",
  withdrawal: "arrow-up-circle-outline",
  escrow_hold: "lock-closed-outline",
  escrow_release: "shield-checkmark-outline",
  fee: "receipt-outline",
  credit: "arrow-down-circle-outline",
  debit: "arrow-up-circle-outline",
};

function normalisePhone(value: string): string {
  let phone = value.replace(/\s+/g, "");
  if (!phone) return "";
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("0")) phone = `254${phone.slice(1)}`;
  if (!phone.startsWith("254")) phone = `254${phone}`;
  return phone;
}

function isValidPhone(value: string): boolean {
  return /^254\d{9}$/.test(normalisePhone(value));
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { isDriver } = useAppMode();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: queryKeys.wallet.summary(),
    queryFn: fetchWalletSummary,
    enabled: !!user,
  });

  const txnQuery = useQuery({
    queryKey: queryKeys.wallet.transactions(),
    queryFn: () => fetchWalletTransactions(),
    enabled: !!user,
  });

  const withdrawalQuery = useQuery({
    queryKey: queryKeys.wallet.withdrawals(),
    queryFn: () => fetchWithdrawals(),
    enabled: !!user,
  });

  const summary: WalletSummary = summaryQuery.data ?? EMPTY_WALLET_SUMMARY;
  const transactions = txnQuery.data ?? [];

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.wallet.all() });
  }, [queryClient]);

  const pendingOut = useMemo(
    () =>
      (withdrawalQuery.data ?? [])
        .filter((w) => w.status === "pending" || w.status === "processing")
        .reduce((total, w) => total + w.amount, 0),
    [withdrawalQuery.data],
  );

  const loading =
    summaryQuery.isLoading || txnQuery.isLoading || withdrawalQuery.isLoading;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="titleMedium" color={colors.text} style={styles.bold}>
          Wallet
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={refreshAll}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <View
            style={[styles.hero, { backgroundColor: colors.primaryContainer }]}
          >
            <View style={styles.heroCap}>
              <Icon
                name="wallet-outline"
                size={16}
                color={colors.onPrimaryContainer}
              />
              <Text variant="labelMedium" color={colors.onPrimaryContainer}>
                Available balance
              </Text>
            </View>
            <Text variant="displayMedium" color={colors.onPrimaryContainer}>
              {formatKes(summary.balance)}
            </Text>
            <View style={styles.heroActions}>
              <Button
                label="Top up"
                icon="add-outline"
                size="sm"
                onPress={() => {
                  haptic.light();
                  setTopUpOpen(true);
                }}
              />
              <Button
                label="Withdraw"
                icon="arrow-up-outline"
                size="sm"
                variant="outlined"
                onPress={() => {
                  haptic.light();
                  setWithdrawOpen(true);
                }}
              />
            </View>
          </View>
        </Animated.View>

        {pendingOut > 0 && (
          <View
            style={[
              styles.pending,
              { backgroundColor: colors.tertiaryContainer },
            ]}
          >
            <Icon
              name="time-outline"
              size={18}
              color={colors.onTertiaryContainer}
            />
            <Text variant="bodySmall" color={colors.onTertiaryContainer}>
              {formatKes(pendingOut)} is on its way to M-Pesa.
            </Text>
          </View>
        )}

        <Tile
          icon="lock-closed-outline"
          title="Held in escrow"
          value={formatKes(summary.in_escrow)}
          note="Fares you've paid for rides that haven't finished. Kipita holds this and releases it to your driver when the trip ends."
        />

        {(isDriver || summary.pending_earnings > 0) && (
          <Tile
            icon="shield-checkmark-outline"
            title="Waiting to be released"
            value={formatKes(summary.pending_earnings)}
            note="Your share of fares passengers have already paid. It lands in your balance once you end each ride."
          />
        )}

        {(isDriver || summary.lifetime_earnings > 0) && (
          <Tile
            icon="trending-up-outline"
            title="Earned all time"
            value={formatKes(summary.lifetime_earnings)}
            note="Everything Kipita has released to you, after the platform fee."
          />
        )}

        <Text
          variant="titleMedium"
          color={colors.text}
          style={[styles.bold, styles.sectionTitle]}
        >
          Activity
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            message="Nothing here yet. Top up your wallet or book a ride — holds, refunds and payouts all show up here."
          />
        ) : (
          <View style={styles.ledger}>
            {transactions.map((txn) => (
              <TxnRow key={txn.id} txn={txn} />
            ))}
          </View>
        )}
      </ScrollView>

      <TopUpModal
        visible={topUpOpen}
        defaultPhone={user?.phone ?? ""}
        onClose={() => setTopUpOpen(false)}
        onDone={() => {
          setTopUpOpen(false);
          refreshAll();
        }}
      />

      <WithdrawModal
        visible={withdrawOpen}
        summary={summary}
        defaultPhone={user?.phone ?? ""}
        onClose={() => setWithdrawOpen(false)}
        onDone={() => {
          setWithdrawOpen(false);
          refreshAll();
        }}
      />
    </View>
  );
}

function Tile({
  icon,
  title,
  value,
  note,
}: {
  icon: IconName;
  title: string;
  value: string;
  note: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surfaceContainer }]}>
      <View style={styles.tileCap}>
        <Icon name={icon} size={15} color={colors.onSurfaceVariant} />
        <Text variant="labelMedium" color={colors.onSurfaceVariant}>
          {title}
        </Text>
      </View>
      <Text variant="headlineSmall" color={colors.onSurface}>
        {value}
      </Text>
      <Text variant="caption" color={colors.onSurfaceVariant}>
        {note}
      </Text>
    </View>
  );
}

function TxnRow({ txn }: { txn: WalletTransaction }) {
  const { colors } = useTheme();
  const held = !movesBalance(txn.type);
  const amountColor = held
    ? colors.onSurfaceVariant
    : txn.amount < 0
      ? colors.onSurface
      : colors.primary;

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainer }]}>
      <View
        style={[
          styles.rowGlyph,
          { backgroundColor: colors.surfaceContainerHigh },
        ]}
      >
        <Icon
          name={TXN_ICON[txn.type] ?? "receipt-outline"}
          size={18}
          color={colors.onSurfaceVariant}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text variant="labelLarge" color={colors.onSurface} numberOfLines={1}>
          {txnLabel(txn.type)}
        </Text>
        <Text
          variant="caption"
          color={colors.onSurfaceVariant}
          numberOfLines={1}
        >
          {formatWhen(txn.created_at)}
          {txn.description ? ` · ${txn.description}` : ""}
        </Text>
      </View>
      <Text variant="labelLarge" color={amountColor}>
        {txnSignedAmount(txn)}
      </Text>
    </View>
  );
}

function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + spacing.xl,
            },
          ]}
        >
          <View
            style={[styles.grip, { backgroundColor: colors.outlineVariant }]}
          />
          <Text variant="titleLarge" color={colors.onSurface}>
            {title}
          </Text>
          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            {subtitle}
          </Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type TopUpStage = "form" | "pushing" | "waiting" | "done" | "failed" | "timeout";

function TopUpModal({
  visible,
  defaultPhone,
  onClose,
  onDone,
}: {
  visible: boolean;
  defaultPhone: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState("500");
  const [phone, setPhone] = useState(defaultPhone);
  const [stage, setStage] = useState<TopUpStage>("form");
  const [error, setError] = useState("");

  const value = Number(amount);
  const busy = stage === "pushing" || stage === "waiting";
  const valid = isValidTopupAmount(value) && isValidPhone(phone);

  const close = useCallback(() => {
    if (busy) return;
    setStage("form");
    setError("");
    onClose();
  }, [busy, onClose]);

  const submit = useCallback(async () => {
    if (!valid || busy) return;
    setError("");
    setStage("pushing");
    try {
      const { topup_id } = await startTopup({
        amount: value,
        phone: normalisePhone(phone),
      });
      setStage("waiting");
      const outcome = await pollTopupStatus(topup_id);
      if (outcome === "completed") {
        haptic.success();
        setStage("done");
      } else if (outcome === "failed") {
        setStage("failed");
      } else {
        setStage("timeout");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reach M-Pesa. Try again.",
      );
      setStage("form");
    }
  }, [valid, busy, value, phone]);

  return (
    <Sheet
      visible={visible}
      title="Top up your wallet"
      subtitle="Add money with M-Pesa to pay for fares faster."
      onClose={close}
    >
      {stage === "done" ? (
        <Status
          icon="checkmark-circle"
          tone={colors.primary}
          title={`${formatKes(value)} added`}
          message="Your Kipita balance is up to date."
          actionLabel="Done"
          onAction={() => {
            setStage("form");
            onDone();
          }}
        />
      ) : stage === "failed" ? (
        <Status
          icon="alert-circle"
          tone={colors.error}
          title="Top-up didn't go through"
          message="M-Pesa declined or the request was cancelled. Nothing was charged."
          actionLabel="Try again"
          onAction={() => setStage("form")}
        />
      ) : stage === "timeout" ? (
        <Status
          icon="time"
          tone={colors.onSurfaceVariant}
          title="Still waiting on M-Pesa"
          message="The prompt may still be on your phone. If you complete it, your balance updates on its own."
          actionLabel="Close"
          onAction={() => {
            setStage("form");
            onDone();
          }}
        />
      ) : busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text variant="titleSmall" color={colors.onSurface} align="center">
            {stage === "pushing" ? "Sending the request…" : "Check your phone"}
          </Text>
          <Text
            variant="bodySmall"
            color={colors.onSurfaceVariant}
            align="center"
          >
            {stage === "pushing"
              ? "Asking M-Pesa to prompt your number."
              : `Enter your M-Pesa PIN to add ${formatKes(value)}.`}
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          {!!error && (
            <Text variant="bodySmall" color={colors.error}>
              {error}
            </Text>
          )}
          <TextInput
            label="Amount"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder="500"
          />
          <View style={styles.presets}>
            {TOPUP_PRESETS.map((preset) => {
              const active = value === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setAmount(String(preset))}
                  style={[
                    styles.preset,
                    {
                      backgroundColor: active
                        ? colors.primaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    variant="labelMedium"
                    color={
                      active
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant
                    }
                  >
                    {formatKes(preset)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            label="M-Pesa number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="07XX XXX XXX"
            hint={`Between ${formatKes(MIN_TOPUP)} and ${formatKes(MAX_TOPUP)}.`}
          />
          <Button
            label={`Add ${isValidTopupAmount(value) ? formatKes(value) : "money"}`}
            icon="phone-portrait-outline"
            onPress={submit}
            disabled={!valid}
            fullWidth
          />
        </View>
      )}
    </Sheet>
  );
}

type WithdrawStage = "form" | "sending" | "done" | "queued";

function WithdrawModal({
  visible,
  summary,
  defaultPhone,
  onClose,
  onDone,
}: {
  visible: boolean;
  summary: WalletSummary;
  defaultPhone: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const [stage, setStage] = useState<WithdrawStage>("form");
  const [error, setError] = useState("");

  const value = Number(amount);
  const busy = stage === "sending";
  const valid = canWithdraw(summary, value) && isValidPhone(phone);
  const belowMinimum = summary.balance < MIN_WITHDRAWAL;

  const close = useCallback(() => {
    if (busy) return;
    setStage("form");
    setError("");
    onClose();
  }, [busy, onClose]);

  const submit = useCallback(async () => {
    if (!valid || busy) return;
    setError("");
    setStage("sending");
    try {
      const result = await requestWithdrawal({
        amount: value,
        phone: normalisePhone(phone),
      });
      haptic.success();
      setStage(result.status === "paid" ? "done" : "queued");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reach M-Pesa. Your balance is unchanged.",
      );
      setStage("form");
    }
  }, [valid, busy, value, phone]);

  return (
    <Sheet
      visible={visible}
      title="Withdraw to M-Pesa"
      subtitle="Move your Kipita balance to your phone."
      onClose={close}
    >
      {stage === "done" || stage === "queued" ? (
        <Status
          icon="checkmark-circle"
          tone={colors.primary}
          title={
            stage === "done"
              ? `${formatKes(value)} on its way`
              : "Withdrawal queued"
          }
          message={
            stage === "done"
              ? `M-Pesa is sending ${formatKes(value)} to ${phone}.`
              : `We've reserved ${formatKes(value)} and will send it to ${phone} shortly.`
          }
          actionLabel="Done"
          onAction={() => {
            setStage("form");
            setAmount("");
            onDone();
          }}
        />
      ) : busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text variant="titleSmall" color={colors.onSurface} align="center">
            Sending to M-Pesa…
          </Text>
        </View>
      ) : belowMinimum ? (
        <Status
          icon="alert-circle"
          tone={colors.onSurfaceVariant}
          title="Not enough to withdraw yet"
          message={`The smallest withdrawal is ${formatKes(MIN_WITHDRAWAL)}. You have ${formatKes(summary.balance)} available.`}
          actionLabel="Close"
          onAction={close}
        />
      ) : (
        <View style={styles.form}>
          {!!error && (
            <Text variant="bodySmall" color={colors.error}>
              {error}
            </Text>
          )}
          <TextInput
            label="Amount"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))}
            keyboardType="number-pad"
            placeholder={String(MIN_WITHDRAWAL)}
            hint={`Available ${formatKes(summary.balance)} · minimum ${formatKes(MIN_WITHDRAWAL)}`}
          />
          <Pressable
            onPress={() => setAmount(String(Math.floor(summary.balance)))}
            hitSlop={8}
            style={styles.maxRow}
          >
            <Text variant="labelMedium" color={colors.primary}>
              Withdraw everything
            </Text>
          </Pressable>
          <TextInput
            label="Send to M-Pesa number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="07XX XXX XXX"
            hint="Money held in escrow for unfinished rides can't be withdrawn yet."
          />
          <Button
            label="Withdraw"
            icon="arrow-up-outline"
            onPress={submit}
            disabled={!valid}
            fullWidth
          />
        </View>
      )}
    </Sheet>
  );
}

function Status({
  icon,
  tone,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  tone: string;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.busy}>
      <Icon name={icon} size={44} color={tone} />
      <Text variant="titleSmall" color={colors.onSurface} align="center">
        {title}
      </Text>
      <Text variant="bodySmall" color={colors.onSurfaceVariant} align="center">
        {message}
      </Text>
      <Button label={actionLabel} onPress={onAction} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bold: { fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  heroCap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  tile: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  tileCap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: { marginTop: spacing.md },
  loader: { marginVertical: spacing["3xl"] },
  ledger: { gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowGlyph: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000080",
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.xs,
  },
  grip: {
    width: 42,
    height: 4,
    borderRadius: radius.full,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  form: { gap: spacing.md, marginTop: spacing.lg },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  maxRow: { alignSelf: "flex-end" },
  busy: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing["3xl"],
  },
});
