import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { readHidden } from "./read-hidden-input.mjs";

class FakeTerminal extends EventEmitter {
  isTTY = true;
  rawMode = false;
  nextReject;

  setRawMode(value) { this.rawMode = value; }
  resume() {}

  [Symbol.asyncIterator]() {
    return {
      next: () => new Promise((resolve, reject) => {
        this.nextReject = reject;
      }),
    };
  }

  abortReadlineIterator() {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    error.code = "ABORT_ERR";
    this.nextReject?.(error);
  }
}

test("password input survives readline closing its input iterator", async () => {
  const input = new FakeTerminal();
  let outputText = "";
  const output = { write: (text) => { outputText += text; } };
  const pending = readHidden("Password: ", { input, output });

  await new Promise((resolve) => setImmediate(resolve));
  input.abortReadlineIterator();
  input.emit("data", Buffer.from("correct-horse-7\r"));

  assert.equal(await pending, "correct-horse-7");
  assert.equal(input.rawMode, false);
  assert.equal(outputText, "Password: \n");
});

test("password input handles backspace and rejects non-interactive input", async () => {
  const input = new FakeTerminal();
  const pending = readHidden("Password: ", { input, output: { write() {} } });
  await new Promise((resolve) => setImmediate(resolve));
  input.emit("data", Buffer.from("wrongx\u007fcorrect-horse-7\r"));
  assert.equal(await pending, "wrongcorrect-horse-7");

  await assert.rejects(
    readHidden("Password: ", { input: { isTTY: false }, output: { write() {} } }),
    /terminal interactiva/,
  );
});
