// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  UNSEEN_ALERT_WINDOW_DAYS,
  createUnseenAlertStore,
  pickUnseen,
  unseenWindowStart,
} from "./unseen-alerts.ts";

const NOW = new Date("2026-11-20T10:00:00Z");

test("the window is seven days", () => {
  assert.equal(UNSEEN_ALERT_WINDOW_DAYS, 7);
  assert.equal(unseenWindowStart(NOW).toISOString(), "2026-11-13T10:00:00.000Z");
  assert.equal(unseenWindowStart(NOW.getTime()).toISOString(), "2026-11-13T10:00:00.000Z");
});

test("pickUnseen drops viewed alerts and keeps the order", () => {
  assert.deepEqual(pickUnseen(["a", "b", "c", "d"], ["b", "d"]), ["a", "c"]);
});

test("pickUnseen: nothing viewed means everything is unread, nothing recent means nothing", () => {
  assert.deepEqual(pickUnseen(["a", "b"], []), ["a", "b"]);
  assert.deepEqual(pickUnseen([], ["a"]), []);
});

test("pickUnseen ignores viewed ids that are not in the recent list, and accepts any iterable", () => {
  assert.deepEqual(pickUnseen(["a"], new Set(["zzz"])), ["a"]);
});

test("pickUnseen does not change its input", () => {
  const recent = ["a", "b"];
  pickUnseen(recent, ["a"]);
  assert.deepEqual(recent, ["a", "b"]);
});

test("a new store is empty", () => {
  const store = createUnseenAlertStore();
  assert.equal(store.getSnapshot().size, 0);
  assert.equal(store.has("a"), false);
});

test("replace sets the unread alerts and tells subscribers once", () => {
  const store = createUnseenAlertStore();
  let calls = 0;
  store.subscribe(() => calls++);
  store.replace(["a", "b", "c"]);
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().size, 3);
  assert.equal(store.has("b"), true);
});

test("replace with the same ids changes nothing: same snapshot, nobody told", () => {
  const store = createUnseenAlertStore();
  store.replace(["a", "b"]);
  const before = store.getSnapshot();
  let calls = 0;
  store.subscribe(() => calls++);
  store.replace(["b", "a"]);
  assert.equal(calls, 0);
  assert.equal(store.getSnapshot(), before);
});

test("replace with a different set swaps it, including down to empty", () => {
  const store = createUnseenAlertStore();
  store.replace(["a", "b"]);
  store.replace(["b", "c"]);
  assert.equal(store.has("a"), false);
  assert.equal(store.has("c"), true);
  store.replace([]);
  assert.equal(store.getSnapshot().size, 0);
});

test("markSeen removes one alert and gives a new snapshot", () => {
  const store = createUnseenAlertStore();
  store.replace(["a", "b"]);
  const before = store.getSnapshot();
  let calls = 0;
  store.subscribe(() => calls++);
  store.markSeen("a");
  assert.equal(calls, 1);
  assert.equal(store.has("a"), false);
  assert.equal(store.has("b"), true);
  assert.notEqual(store.getSnapshot(), before);
  // The old snapshot is untouched.
  assert.equal(before.has("a"), true);
});

test("markSeen on an alert that is not marked tells nobody; marking twice tells nobody the second time", () => {
  const store = createUnseenAlertStore();
  store.replace(["a"]);
  const before = store.getSnapshot();
  let calls = 0;
  store.subscribe(() => calls++);
  store.markSeen("zzz");
  assert.equal(calls, 0);
  assert.equal(store.getSnapshot(), before);
  store.markSeen("a");
  store.markSeen("a");
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().size, 0);
});

test("a fetch that finishes after the alert was opened does not bring the marker back", () => {
  const store = createUnseenAlertStore();
  store.replace(["a", "b"]);
  // The person opens "a" while a refresh that already read the old list is still running.
  store.markSeen("a");
  store.replace(["a", "b", "c"]);
  assert.equal(store.has("a"), false);
  assert.deepEqual([...store.getSnapshot()].sort(), ["b", "c"]);
});

test("opening an alert before the first fetch has finished keeps it cleared", () => {
  const store = createUnseenAlertStore();
  store.markSeen("a");
  store.replace(["a", "b"]);
  assert.deepEqual([...store.getSnapshot()], ["b"]);
});

test("reset empties the store once and forgets what was opened", () => {
  const store = createUnseenAlertStore();
  store.replace(["a", "b"]);
  store.markSeen("a");
  let calls = 0;
  store.subscribe(() => calls++);
  store.reset();
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().size, 0);
  store.reset();
  assert.equal(calls, 1);
  store.replace(["a"]);
  assert.equal(store.has("a"), true);
});

test("unsubscribing stops notifications, and a listener can unsubscribe while being notified", () => {
  const store = createUnseenAlertStore();
  let first = 0;
  let second = 0;
  const off = store.subscribe(() => {
    first++;
    off();
  });
  store.subscribe(() => second++);
  store.replace(["a"]);
  store.replace(["b"]);
  assert.equal(first, 1);
  assert.equal(second, 2);
});

test("two stores do not share state", () => {
  const a = createUnseenAlertStore();
  const b = createUnseenAlertStore();
  a.replace(["x"]);
  assert.equal(b.has("x"), false);
});
