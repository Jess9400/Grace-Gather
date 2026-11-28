import assert from "node:assert/strict";
import test from "node:test";
import { gatheringFieldsToCheck } from "../src/lib/gathering-form.ts";

const scheduled = {
  title: "Evening prayer",
  description: "A quiet time to pray together.",
  topic: "Prayer",
  name: "Host",
  date: "2026-12-01",
  time: "19:30",
  zone: "America/Sao_Paulo",
  capacity: "20",
  minutes: "60",
  occurrences: "8",
  weekly: false,
  now: false,
};

test("an incomplete submission identifies every missing field in form order", () => {
  assert.deepEqual(
    gatheringFieldsToCheck({
      ...scheduled,
      title: " a ",
      description: "  short  ",
      topic: "  ",
      name: "",
      date: "",
      time: "",
      zone: "",
      capacity: "abc",
      minutes: "1.5",
    }),
    [
      "gatheringTitleLabel",
      "gatheringDescriptionLabel",
      "topic",
      "hostName",
      "dateLabel",
      "timeLabel",
      "timezone",
      "capacity",
      "duration",
    ],
  );
});

test("live gatherings need no schedule, and only scheduled series validate the session count", () => {
  assert.deepEqual(gatheringFieldsToCheck(scheduled), []);
  assert.deepEqual(
    gatheringFieldsToCheck({ ...scheduled, weekly: true, occurrences: "1" }),
    ["sessionCount"],
  );
  assert.deepEqual(
    gatheringFieldsToCheck({
      ...scheduled,
      now: true,
      weekly: true,
      date: "",
      time: "",
      occurrences: "",
    }),
    [],
  );
  assert.deepEqual(
    gatheringFieldsToCheck({
      ...scheduled,
      weekly: true,
      occurrences: "52",
      capacity: "100",
      minutes: "180",
    }),
    [],
  );
});
