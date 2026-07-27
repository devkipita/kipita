import React, { memo, useState } from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { Icon } from "../core/Icon";
import type { IconName } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius } from "@/theme";

/**
 * Full emoji experience — the common Unicode groups, each with a large curated
 * range. No native dependency: plain glyphs rendered by the system font, so it
 * works identically on iOS, Android and web.
 */
interface EmojiCategory {
  key: string;
  icon: IconName;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    key: "smileys",
    icon: "happy-outline",
    emojis: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","🥹","😊","😇","🙂","🙃","😉","😌",
      "😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸",
      "🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢",
      "😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔",
      "🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤",
      "😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👻","💀",
      "☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
    ],
  },
  {
    key: "gestures",
    icon: "hand-left-outline",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️",
      "🫵","👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👏","🙌","🫶","👐","🤲","🙏",
      "🤝","💪","🦾","✍️","💅","🤳","👂","🦻","👃","🧠","🫀","🫁","🦷","👀","👁️","👅",
      "👄","🫦","💋","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💯","💢",
      "💥","💫","💦","💨","🔥","⭐","🌟","✨","⚡","✅","❌","❗","❓",
    ],
  },
  {
    key: "people",
    icon: "people-outline",
    emojis: [
      "👶","🧒","👦","👧","🧑","👨","👩","🧓","👴","👵","🧔","👮","🕵️","💂","👷","🤴",
      "👸","👳","👲","🧕","🤵","👰","🤰","🤱","👼","🎅","🤶","🦸","🦹","🧙","🧚","🧛",
      "🧜","🧝","🧞","🧟","💆","💇","🚶","🏃","💃","🕺","👯","🧖","🧗","🤺","🏇","⛷️",
      "🏂","🏌️","🏄","🚣","🏊","⛹️","🏋️","🚴","🚵","🤸","🤼","🤽","🤾","🤹","🧘","👨‍👩‍👧",
      "👪","🫂","👣",
    ],
  },
  {
    key: "animals",
    icon: "paw-outline",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
      "🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝",
      "🐛","🦋","🐌","🐞","🐜","🦗","🕷️","🦂","🐢","🐍","🦎","🐙","🦑","🦐","🦀","🐡",
      "🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦏","🐫","🦒","🐃",
      "🐄","🐎","🐑","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🕊️","🐇","🐁","🐿️","🦔","🌵",
      "🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎍","🌾","🌺","🌻","🌹","🌷","🌸","💐","🍄",
    ],
  },
  {
    key: "food",
    icon: "fast-food-outline",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🍞",
      "🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕",
      "🌮","🌯","🥙","🧆","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🍤","🍙","🍚",
      "🍘","🍥","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫",
      "🍿","🍩","🍪","☕","🍵","🧃","🥤","🧋","🍺","🍻","🥂","🍷","🥃","🍹","🍸","🧉",
    ],
  },
  {
    key: "travel",
    icon: "car-outline",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵",
      "🚲","🛴","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄",
      "🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🚁","🚀","🛸","⛵",
      "🚤","🛥️","🛳️","⛴️","🚢","⚓","⛽","🚧","🚦","🚥","🗺️","🗿","🗽","🏰","🎡","🎢",
      "🎠","⛱️","🏖️","🏝️","🏔️","⛰️","🌋","🏕️","⛺","🏠","🏡","🏢","🏬","🏭","🏯","🏗️",
    ],
  },
  {
    key: "objects",
    icon: "bulb-outline",
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🕹️","💽","💾","📷","📸","📹","🎥","📞","☎️",
      "📟","📠","📺","📻","🎙️","⏰","⏱️","⌛","🔋","🔌","💡","🔦","🕯️","🧯","🛢️","💸",
      "💵","💴","💶","💷","💰","💳","💎","⚖️","🔧","🔨","⚒️","🛠️","⛏️","🔩","⚙️","🧰",
      "🧲","🔫","💣","🧨","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🔮","📿","🧿","💈","🔭","🔬",
      "💊","💉","🩹","🩺","🌡️","🧬","🦠","🧫","🧪","📔","📕","📖","📗","📘","📙","📚",
      "📝","✏️","🖊️","🖌️","🖍️","📌","📍","📎","🔗","📁","📅","📆","📊","📈","📉","🗓️",
    ],
  },
  {
    key: "symbols",
    icon: "sparkles-outline",
    emojis: [
      "🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","🎖️","🏅","🎗️","🎯","🎮","🎲","🎸",
      "🎵","🎶","🎼","🎤","🎧","🥁","🎹","🎺","🎻","🪕","♻️","✔️","☑️","🔘","🔴","🟠",
      "🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","💠","🔶","🔷","🔸","🔹","🟥","🟧",
      "🟨","🟩","🟦","🟪","⬛","⬜","♠️","♥️","♦️","♣️","🃏","🀄","🕐","➕","➖","➗",
      "✖️","🟰","♾️","‼️","⁉️","〰️","💲","💱","©️","®️","™️","🔝","🔚","🔙","🔛","🔜",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPicker = memo(function EmojiPicker({
  onSelect,
}: EmojiPickerProps) {
  const { colors } = useTheme();
  const [active, setActive] = useState(CATEGORIES[0].key);
  const activeSet =
    CATEGORIES.find((c) => c.key === active)?.emojis ?? CATEGORIES[0].emojis;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceContainer }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
      >
        {activeSet.map((emoji, i) => (
          <Pressable
            key={`${emoji}-${i}`}
            onPress={() => onSelect(emoji)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={`Emoji ${emoji}`}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Category switcher */}
      <View style={styles.tabs}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {CATEGORIES.map((cat) => {
            const on = active === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setActive(cat.key)}
                style={[
                  styles.tab,
                  on && { backgroundColor: colors.primaryContainer },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Icon
                  name={cat.icon}
                  size={20}
                  color={on ? colors.onPrimaryContainer : colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          onPress={() => onSelect("")}
          style={styles.backspace}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Backspace"
        >
          <Icon name="backspace-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    height: 300,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.sm,
  },
  cell: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabsScroll: {
    flex: 1,
  },
  tabsRow: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    width: 40,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  backspace: {
    width: 40,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
