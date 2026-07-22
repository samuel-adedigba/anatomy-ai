const assert = require("node:assert/strict");
const test = require("node:test");

const {
  parseAnswerToCommand,
} = require("../dist/parsers/answerParser.js");
const {
  buildDirectCommand,
} = require("../dist/parsers/directCommandBuilder.js");

test("parses a grounded heart answer into a visual command", () => {
  const command = parseAnswerToCommand(
    "The heart contracts to move blood.",
    "The heart has left and right ventricles."
  );

  assert.equal(command.focus_region, "heart");
  assert.equal(command.view_mode, "heart");
  assert.equal(command.animation, "contract");
  assert.ok(command.highlight.includes("Heart_Mesh"));
  assert.ok(command.confidence >= 0.4);
});

test("returns the safe full-body fallback when no region matches", () => {
  const command = parseAnswerToCommand(
    "The available sources do not cover this topic in enough detail.",
    ""
  );

  assert.deepEqual(command, {
    focus_region: "full_body",
    view_mode: "full_body",
    highlight: [],
    animation: "none",
    confidence: 0,
  });
});

test("builds deterministic direct commands", () => {
  const command = buildDirectCommand("spine", "spine");

  assert.equal(command.focus_region, "spine");
  assert.equal(command.view_mode, "spine");
  assert.ok(command.highlight.includes("Lumbar_Spine"));
  assert.equal(command.confidence, 1);
});
