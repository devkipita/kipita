// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANON_AVATAR_PALETTES,
  ANON_AVATAR_SHAPES,
  anonAvatarFor,
} from "./anon-avatar.ts";

const ID = "3ef67a9e-fe55-4488-b3d9-9f29ed261dc6";

test("the same id always gives the same picture", () => {
  assert.deepEqual(anonAvatarFor(ID), anonAvatarFor(ID));
});

test("case and surrounding spaces do not change it", () => {
  assert.deepEqual(anonAvatarFor(` ${ID.toUpperCase()} `), anonAvatarFor(ID));
});

test("indexes stay inside the palette and shape counts", () => {
  for (let i = 0; i < 500; i += 1) {
    const a = anonAvatarFor(`user-${i}`);
    assert.ok(Number.isInteger(a.palette));
    assert.ok(a.palette >= 0 && a.palette < ANON_AVATAR_PALETTES);
    assert.ok(Number.isInteger(a.shape));
    assert.ok(a.shape >= 0 && a.shape < ANON_AVATAR_SHAPES);
  }
});

test("a few hundred people use every palette and every shape", () => {
  const palettes = new Set<number>();
  const shapes = new Set<number>();
  for (let i = 0; i < 300; i += 1) {
    const a = anonAvatarFor(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    palettes.add(a.palette);
    shapes.add(a.shape);
  }
  assert.equal(palettes.size, ANON_AVATAR_PALETTES);
  assert.equal(shapes.size, ANON_AVATAR_SHAPES);
});

test("a missing or blank id still gives one fixed, valid picture", () => {
  assert.deepEqual(anonAvatarFor(null), anonAvatarFor(undefined));
  assert.deepEqual(anonAvatarFor(""), anonAvatarFor("   "));
  const a = anonAvatarFor(null);
  assert.ok(a.palette < ANON_AVATAR_PALETTES && a.shape < ANON_AVATAR_SHAPES);
});

test("the picture carries nothing of the name or photo", () => {
  assert.deepEqual(Object.keys(anonAvatarFor(ID)).sort(), ["palette", "shape"]);
});
