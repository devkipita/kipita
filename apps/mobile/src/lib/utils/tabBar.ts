import { makeMutable } from 'react-native-reanimated';

/**
 * Shared visibility driver for the floating tab bar.
 * 0 = fully visible, 1 = slid down / hidden. Scrollable screens nudge this on
 * scroll; the FloatingTabBar reads it to animate itself out of the way.
 */
export const tabBarHidden = makeMutable(0);
