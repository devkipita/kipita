// Run with: yarn workspace @kipita/shared test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CAR_SEATS_MISSING,
  CLASS_PASSENGERS,
  LEAST_CAR_SEATS,
  MOST_CAR_SEATS,
  MOST_PASSENGERS,
  carSeatsText,
  carryLimitText,
  classExamples,
  classForCar,
  classHolds,
  className,
  isCarSeats,
  maxOthersFor,
  maxPassengersFor,
  passengerLimit,
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

test("the room for people riding along is what the type carries, less the seats", () => {
  assert.equal(maxOthersFor("sedan", 3), 1);
  assert.equal(maxOthersFor("sedan", 4), 0);
  assert.equal(maxOthersFor("hatch", 1), 3);
  assert.equal(maxOthersFor("suv_petrol", 2), 2);
  assert.equal(maxOthersFor("suv_diesel", 5), 1);
  assert.equal(maxOthersFor("suv_diesel", 6), 0);
  assert.equal(maxOthersFor("minivan", 6), 2);
  assert.equal(maxOthersFor("minivan", 7), 1);
  assert.equal(maxOthersFor("minivan", 8), 0);
});

test("the room for people riding along is never negative", () => {
  assert.equal(maxOthersFor("sedan", 5), 0);
  assert.equal(maxOthersFor("minivan", 20), 0);
});

test("a type that is not listed leaves room up to the most a trip can list", () => {
  assert.equal(maxOthersFor("tuktuk", 2), MOST_PASSENGERS - 2);
});

test("every car type with room for others stays inside the most a trip can list", () => {
  for (const code of Object.keys(CLASS_PASSENGERS)) {
    for (let seats = 1; seats <= MOST_PASSENGERS; seats++) {
      assert.ok(seats + maxOthersFor(code, seats) <= MOST_PASSENGERS, `${code} with ${seats} seats`);
      assert.ok(classHolds(code, seats + maxOthersFor(code, seats)) || maxOthersFor(code, seats) === 0, `${code} with ${seats} seats holds them`);
    }
  }
});

test("people riding along never move the trip to a bigger type: only the seats decide it", () => {
  // The type is picked from the seats alone. A sedan with 4 seats stays a sedan; there is simply no room for others.
  assert.equal(pickVehicleClass(CLASSES, { seats: 4 })?.code, "sedan");
  assert.equal(maxOthersFor("sedan", 4), 0);
  assert.equal(pickVehicleClass(CLASSES, { seats: 3 })?.code, "sedan");
  assert.equal(pickVehicleClass(CLASSES, { seats: 5 })?.code, "suv_diesel");
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

test("the limit text names the type, its limit and how many seats the driver offered", () => {
  assert.equal(
    carryLimitText("Sedan or wagon (Axio, Premio, Fielder)", "sedan", 8),
    "Sedan or wagon carries up to 4 passengers. You offered 8. Offer fewer seats or pick a bigger car type.",
  );
});

test("the limit text blames the people riding along when the seats alone fit", () => {
  assert.equal(
    carryLimitText("Sedan or wagon (Axio, Premio, Fielder)", "sedan", 4, 1),
    "Sedan or wagon carries up to 4 passengers. 4 seats and 1 with you make 5. Change one or pick a bigger car type.",
  );
});

test("the limit text blames the seats when they alone are too many, whoever else rides along", () => {
  assert.equal(
    carryLimitText("Sedan or wagon (Axio, Premio, Fielder)", "sedan", 5, 1),
    "Sedan or wagon carries up to 4 passengers. You offered 5. Offer fewer seats or pick a bigger car type.",
  );
});

// ───────────────────────── the car's own seat count ─────────────────────────

test("a car has between 2 and 9 seats, the driver's own included", () => {
  assert.equal(LEAST_CAR_SEATS, 2);
  assert.equal(MOST_CAR_SEATS, MOST_PASSENGERS + 1);
  for (const n of [2, 5, 7, 9]) assert.equal(isCarSeats(n), true, String(n));
  for (const n of [0, 1, 10, 4.5, -3, NaN, "5", null, undefined]) assert.equal(isCarSeats(n), false, String(n));
});

test("the car's seats can only tighten the car type's limit, never raise it", () => {
  // a 5-seater (4 passengers) in a type that carries 6 is held to 4
  assert.equal(passengerLimit("suv_diesel", 5), 4);
  // a 9-seater in a sedan stays at the sedan's 4
  assert.equal(passengerLimit("sedan", 9), 4);
  // a 7-seater (6 passengers) in a minivan that carries 8 is held to 6
  assert.equal(passengerLimit("minivan", 7), 6);
  // equal limits stay put
  assert.equal(passengerLimit("sedan", 5), 4);
});

test("without a usable seat count the car type's limit stands", () => {
  for (const seats of [undefined, null, 0, 1, 10, 3.5]) {
    assert.equal(passengerLimit("suv_diesel", seats), 6, String(seats));
  }
  assert.equal(passengerLimit("minivan"), 8);
  // a type that is not listed keeps taking the most
  assert.equal(passengerLimit("campervan"), MOST_PASSENGERS);
  assert.equal(passengerLimit("campervan", 4), 3);
});

test("the room for people riding along follows the car's own seats", () => {
  // minivan, 6 seats offered: 2 more fit a 9-seater, none fit a 7-seater
  assert.equal(maxOthersFor("minivan", 6, 9), 2);
  assert.equal(maxOthersFor("minivan", 6, 7), 0);
  // diesel SUV, 3 seats offered: 3 more by type, only 1 in a 5-seater
  assert.equal(maxOthersFor("suv_diesel", 3), 3);
  assert.equal(maxOthersFor("suv_diesel", 3, 5), 1);
  // never negative, even when the seats alone are too many
  assert.equal(maxOthersFor("minivan", 6, 4), 0);
});

test("the car seats text blames the people riding along when the seats alone fit", () => {
  assert.equal(
    carSeatsText(5, 3, 2),
    "Your car has 5 seats and carries up to 4 passengers. 3 seats and 2 with you make 5. Change one.",
  );
});

test("the car seats text blames the seats when they alone are too many", () => {
  assert.equal(
    carSeatsText(5, 5),
    "Your car has 5 seats and carries up to 4 passengers. You offered 5. Offer fewer seats.",
  );
  assert.equal(
    carSeatsText(5, 5, 1),
    "Your car has 5 seats and carries up to 4 passengers. You offered 5. Offer fewer seats.",
  );
});

test("the car seats text reads the same way the screen sorts the type text", () => {
  // PublishBlocker sends "with you make" to the people riding along and "carries up to" to the seats
  assert.match(carSeatsText(5, 3, 2), /with you make/);
  assert.doesNotMatch(carSeatsText(5, 5), /with you make/);
  assert.match(carSeatsText(5, 5), /carries up to/);
});

test("the missing seat count has one wording the screens can recognise", () => {
  assert.equal(CAR_SEATS_MISSING, "Add how many seats your car has.");
  assert.match(CAR_SEATS_MISSING, /how many seats your car has/i);
});
