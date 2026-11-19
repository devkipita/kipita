// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import { classExamples, classForCar, className } from "./vehicle-class.ts";

const CLASSES = [
  { code: "hatch", label: "Small car (Vitz, Passo, Demio)" },
  { code: "sedan", label: "Sedan or wagon (Axio, Premio, Fielder)" },
  { code: "suv_petrol", label: "SUV, petrol (CX-5, Forester, Harrier)" },
  { code: "suv_diesel", label: "SUV, diesel (Prado, Fortuner)" },
  { code: "minivan", label: "Minivan (Noah, Voxy)" },
];

test("examples are read from the label in lower case", () => {
  assert.deepEqual(classExamples("Small car (Vitz, Passo, Demio)"), ["vitz", "passo", "demio"]);
});

test("a hyphen in an example is ignored", () => {
  assert.deepEqual(classExamples("SUV, petrol (CX-5, Forester)"), ["cx5", "forester"]);
});

test("a label without examples has none", () => {
  assert.deepEqual(classExamples("Minivan"), []);
});

test("the name is the label without its examples", () => {
  assert.equal(className("Sedan or wagon (Axio, Premio, Fielder)"), "Sedan or wagon");
  assert.equal(className("Minivan"), "Minivan");
});

test("a listed model finds its car type", () => {
  assert.equal(classForCar("Toyota", "Vitz", CLASSES)?.code, "hatch");
  assert.equal(classForCar("Toyota", "Prado", CLASSES)?.code, "suv_diesel");
  assert.equal(classForCar("Toyota", "Noah", CLASSES)?.code, "minivan");
});

test("case, spacing and hyphens do not matter", () => {
  assert.equal(classForCar("MAZDA", "cx 5", CLASSES)?.code, "suv_petrol");
  assert.equal(classForCar("mazda", "CX-5", CLASSES)?.code, "suv_petrol");
  assert.equal(classForCar("", "  premio ", CLASSES)?.code, "sedan");
});

test("the model can sit in the make box", () => {
  assert.equal(classForCar("Toyota Fielder", "", CLASSES)?.code, "sedan");
});

test("a model that is not listed matches nothing", () => {
  assert.equal(classForCar("Subaru", "Impreza", CLASSES), null);
});

test("empty or tiny input matches nothing", () => {
  assert.equal(classForCar("", "", CLASSES), null);
  assert.equal(classForCar(undefined, undefined, CLASSES), null);
  assert.equal(classForCar("a", "b", CLASSES), null);
});
