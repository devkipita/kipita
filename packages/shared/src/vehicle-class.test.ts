// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLASS_PASSENGERS,
  MOST_PASSENGERS,
  carryLimitText,
  classExamples,
  classForCar,
  classHolds,
  className,
  maxPassengersFor,
  pickVehicleClass,
  smallestClassThatHolds,
} from "./vehicle-class.ts";

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

test("every car type has a limit and the biggest takes the most a trip can list", () => {
  for (const c of CLASSES) assert.ok(c.code in CLASS_PASSENGERS, `${c.code} has no passenger limit`);
  assert.equal(Math.max(...Object.values(CLASS_PASSENGERS)), MOST_PASSENGERS);
});

test("each car type carries its own number of passengers", () => {
  assert.equal(maxPassengersFor("hatch"), 4);
  assert.equal(maxPassengersFor("sedan"), 4);
  assert.equal(maxPassengersFor("suv_petrol"), 4);
  assert.equal(maxPassengersFor("suv_diesel"), 6);
  assert.equal(maxPassengersFor("minivan"), 8);
});

test("a type that is not listed takes the most", () => {
  assert.equal(maxPassengersFor("coach"), MOST_PASSENGERS);
});

test("a sedan holds four passengers but not five", () => {
  assert.equal(classHolds("sedan", 4), true);
  assert.equal(classHolds("sedan", 5), false);
  assert.equal(classHolds("sedan", 8), false);
  assert.equal(classHolds("minivan", 8), true);
});

test("the smallest type that holds the people is picked, the first on a tie", () => {
  assert.equal(smallestClassThatHolds(CLASSES, 1)?.code, "hatch");
  assert.equal(smallestClassThatHolds(CLASSES, 4)?.code, "hatch");
  assert.equal(smallestClassThatHolds(CLASSES, 5)?.code, "suv_diesel");
  assert.equal(smallestClassThatHolds(CLASSES, 6)?.code, "suv_diesel");
  assert.equal(smallestClassThatHolds(CLASSES, 7)?.code, "minivan");
  assert.equal(smallestClassThatHolds(CLASSES, 8)?.code, "minivan");
});

test("no type holds the people when the big ones are missing", () => {
  assert.equal(smallestClassThatHolds(CLASSES.slice(0, 3), 8), null);
  assert.equal(smallestClassThatHolds([], 1), null);
});

test("with nothing asked a trip is priced as a sedan when it fits", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 3 })?.code, "sedan");
  assert.equal(pickVehicleClass(CLASSES, {})?.code, "sedan");
});

test("eight seats are never priced as a sedan", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 8 })?.code, "minivan");
  assert.equal(pickVehicleClass(CLASSES, { seats: 8, requested: "sedan" })?.code, "minivan");
});

test("the people riding along count too", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 3, othersAboard: 1 })?.code, "sedan");
  assert.equal(pickVehicleClass(CLASSES, { seats: 3, othersAboard: 2 })?.code, "suv_diesel");
  assert.equal(pickVehicleClass(CLASSES, { seats: 4, othersAboard: 4 })?.code, "minivan");
});

test("the type the driver asked for is kept when it holds the people", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 3, requested: "hatch" })?.code, "hatch");
  assert.equal(pickVehicleClass(CLASSES, { seats: 6, requested: "minivan" })?.code, "minivan");
});

test("a type that is too small for the seats is set aside", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 5, requested: "hatch" })?.code, "suv_diesel");
});

test("an unknown requested type falls back to the default", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 2, requested: "tank" })?.code, "sedan");
});

test("a car we recognise is priced as its own type, even when it is too small", () => {
  assert.equal(pickVehicleClass(CLASSES, { seats: 8, make: "Toyota", model: "Axio" })?.code, "sedan");
  assert.equal(pickVehicleClass(CLASSES, { seats: 2, make: "Toyota", model: "Noah", requested: "hatch" })?.code, "minivan");
});

test("without a sedan on the list the smallest type that fits is used", () => {
  const noSedan = CLASSES.filter((c) => c.code !== "sedan");
  assert.equal(pickVehicleClass(noSedan, { seats: 3 })?.code, "hatch");
  assert.equal(pickVehicleClass(noSedan, { seats: 7 })?.code, "minivan");
});

test("when no type is big enough the biggest is returned so the caller can say why", () => {
  assert.equal(pickVehicleClass(CLASSES.slice(0, 3), { seats: 8 })?.code, "hatch");
  assert.equal(pickVehicleClass(CLASSES.slice(0, 4), { seats: 8 })?.code, "suv_diesel");
});

test("an empty list gives nothing", () => {
  assert.equal(pickVehicleClass([], { seats: 3 }), null);
});

test("the limit text names the type, its limit and how many the driver has", () => {
  assert.equal(
    carryLimitText("Sedan or wagon (Axio, Premio, Fielder)", "sedan", 8),
    "Sedan or wagon carries up to 4 passengers. You have 8. Offer fewer seats or pick a bigger car type.",
  );
});
