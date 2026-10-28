import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { motionValue } from "motion";
import { Node, Project, SyntaxKind, ts } from "ts-morph";
import {
  createDefaultSequence,
  type SequenceDraft,
  validateSequenceDraft
} from "../../components/Warp/_shared/sequence-editor";
import { createSequenceMappers } from "../../components/Warp/sequence";

const project = new Project({ useInMemoryFileSystem: true });
const source = project.createSourceFile(
  "warp.tsx",
  readFileSync(
    new URL("../../components/Warp/index.tsx", import.meta.url),
    "utf8"
  )
);
const owner = source
  .getVariableDeclarationOrThrow("Warp")
  .getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);
const visibilityEffect = owner
  .getDescendantsOfKind(SyntaxKind.CallExpression)
  .find(
    (call) =>
      call.getExpression().getText() === "useEffect" &&
      call
        .getArguments()[0]
        ?.getText()
        .includes("playbackIntent.current[domain]")
  )
  ?.getArguments()[0];
assert.ok(visibilityEffect && Node.isArrowFunction(visibilityEffect));
const changeSequence = owner
  .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .find((declaration) => declaration.getName() === "changeSequence")
  ?.getInitializerIfKindOrThrow(SyntaxKind.ArrowFunction);
assert.ok(changeSequence);
const changeSequenceExpression = changeSequence.getText();

// Execute the actual production closures, not copies of their implementation.
// React mounting and native animation rendering remain browser acceptance gates.
function bindClosure<T>(
  expression: string,
  dependencies: Record<string, unknown>
): T {
  const javascript = ts.transpileModule(
    `const testedClosure = ${expression};`,
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }
  ).outputText;
  return new Function(
    ...Object.keys(dependencies),
    `${javascript}\nreturn testedClosure;`
  )(...Object.values(dependencies)) as T;
}

function control(initialState: "running" | "paused" | "finished") {
  let state = initialState;
  let pauses = 0;
  let plays = 0;
  return {
    get state() {
      return state;
    },
    get pauses() {
      return pauses;
    },
    get plays() {
      return plays;
    },
    pause() {
      state = "paused";
      pauses += 1;
    },
    play() {
      state = "running";
      plays += 1;
    }
  };
}

test("actual visibility effect pauses both running native controls and resumes intended playback", () => {
  const opening = control("running");
  const scroll = control("running");
  const dependencies = {
    introControl: { current: opening },
    jumpControl: { current: scroll },
    playbackIntent: { current: { opening: true, scroll: true } }
  };
  bindClosure<() => void>(visibilityEffect.getText(), {
    ...dependencies,
    visible: false
  })();
  assert.equal(opening.state, "paused");
  assert.equal(scroll.state, "paused");
  assert.equal(opening.pauses, 1);
  assert.equal(scroll.pauses, 1);
  bindClosure<() => void>(visibilityEffect.getText(), {
    ...dependencies,
    visible: true
  })();
  assert.equal(opening.state, "running");
  assert.equal(scroll.state, "running");
  assert.equal(opening.plays, 1);
  assert.equal(scroll.plays, 1);
});

test("actual visibility effect never resumes a deliberately paused domain across hide/show", () => {
  for (const pausedDomain of ["opening", "scroll"] as const) {
    const opening = control(pausedDomain === "opening" ? "paused" : "running");
    const scroll = control(pausedDomain === "scroll" ? "paused" : "running");
    const dependencies = {
      introControl: { current: opening },
      jumpControl: { current: scroll },
      playbackIntent: {
        current: {
          opening: pausedDomain !== "opening",
          scroll: pausedDomain !== "scroll"
        }
      }
    };
    for (const visible of [false, true, false, true]) {
      bindClosure<() => void>(visibilityEffect.getText(), {
        ...dependencies,
        visible
      })();
    }
    const intentionallyPaused = pausedDomain === "opening" ? opening : scroll;
    const intendedPlayback = pausedDomain === "opening" ? scroll : opening;
    assert.equal(intentionallyPaused.state, "paused");
    assert.equal(intentionallyPaused.plays, 0);
    assert.equal(intentionallyPaused.pauses, 0);
    assert.equal(intendedPlayback.state, "running");
    assert.equal(intendedPlayback.plays, 2);
  }
});

test("actual visibility effect safely skips absent and finished native controls", () => {
  const finished = control("finished");
  for (const visible of [false, true]) {
    bindClosure<() => void>(visibilityEffect.getText(), {
      visible,
      introControl: { current: null },
      jumpControl: { current: finished },
      playbackIntent: { current: { opening: true, scroll: true } }
    })();
  }
  assert.equal(finished.plays, 0);
  assert.equal(finished.pauses, 0);
});

function editingHarness(readyValue = 1) {
  const initial = createDefaultSequence();
  const draftRef = { current: initial };
  const sequenceEdited = { current: false };
  const opening = motionValue(0.5);
  const sequenceMappers = motionValue(createSequenceMappers(initial));
  let pauses = 0;
  let publishedDraft: SequenceDraft | undefined;
  let phase: string | undefined;
  let rebuilds: Array<{
    draft: SequenceDraft;
    seconds: number;
    play: boolean;
  }> = [];
  const change = bindClosure<(next: unknown) => void>(
    changeSequenceExpression,
    {
      validateSequenceDraft,
      createSequenceMappers,
      pauseSequence: () => {
        pauses += 1;
      },
      draftRef,
      opening,
      sequenceEdited,
      setSequenceDraft: (draft: SequenceDraft) => {
        publishedDraft = draft;
      },
      sequenceMappers,
      ready: motionValue(readyValue),
      buildIntro: (draft: SequenceDraft, seconds: number, play: boolean) => {
        rebuilds = [...rebuilds, { draft, seconds, play }];
      },
      setPhase: (next: string) => {
        phase = next;
      },
      overallProgress: motionValue(0.05)
    }
  );
  return {
    initial,
    draftRef,
    sequenceEdited,
    opening,
    sequenceMappers,
    change,
    get pauses() {
      return pauses;
    },
    get publishedDraft() {
      return publishedDraft;
    },
    get phase() {
      return phase;
    },
    get rebuilds() {
      return rebuilds;
    }
  };
}

test("actual changeSequence updates scroll mappers without rebuilding the opening clock", () => {
  const harness = editingHarness();
  const previousMappers = harness.sequenceMappers.get();
  const next = {
    ...harness.initial,
    clips: {
      ...harness.initial.clips,
      headlineScale: { ...harness.initial.clips.headlineScale, end: 15 }
    }
  };
  harness.change(next);
  assert.equal(harness.pauses, 1);
  assert.equal(harness.rebuilds.length, 0);
  assert.equal(harness.sequenceEdited.current, true);
  assert.notEqual(harness.sequenceMappers.get(), previousMappers);
  assert.notEqual(
    harness.sequenceMappers.get().frame(0.05).headlineScale,
    previousMappers.frame(0.05).headlineScale
  );
  assert.deepEqual(harness.publishedDraft, next);
  assert.notEqual(harness.draftRef.current, next);
  assert.equal(harness.opening.get(), 0.5);
  assert.ok(harness.phase);
});

test("actual opening field-only edit updates its mapper without rebuilding glyph playback", () => {
  const harness = editingHarness();
  const previousOpacity = harness.sequenceMappers
    .get()
    .opening(0.5).fieldOpacity;
  harness.change({
    ...harness.initial,
    clips: {
      ...harness.initial.clips,
      openingField: { ...harness.initial.clips.openingField, end: 2 }
    }
  });
  assert.equal(harness.rebuilds.length, 0);
  assert.notEqual(
    harness.sequenceMappers.get().opening(0.5).fieldOpacity,
    previousOpacity
  );
});

test("actual text start, end, ease and opening duration edits rebuild paused at absolute seconds", () => {
  const defaults = createDefaultSequence();
  const edits: SequenceDraft[] = [
    { ...defaults, openingDuration: 4 },
    ...[
      { start: 0.3 },
      { end: 2 },
      { ease: [0.1, 0.2, 0.7, 1] as [number, number, number, number] }
    ].map((change) => ({
      ...defaults,
      clips: {
        ...defaults.clips,
        openingText: { ...defaults.clips.openingText, ...change }
      }
    }))
  ];
  for (const next of edits) {
    const harness = editingHarness();
    harness.change(next);
    assert.equal(harness.rebuilds.length, 1);
    assert.equal(harness.rebuilds[0].play, false);
    assert.equal(harness.rebuilds[0].seconds, defaults.openingDuration * 0.5);
    assert.deepEqual(harness.rebuilds[0].draft, next);
  }
});

test("actual changeSequence validates before touching playback, draft or mappers", () => {
  for (const invalid of [
    null,
    {},
    { ...createDefaultSequence(), openingDuration: 0 }
  ]) {
    const harness = editingHarness();
    const previousMappers = harness.sequenceMappers.get();
    harness.change(invalid);
    assert.equal(harness.pauses, 0);
    assert.equal(harness.sequenceEdited.current, false);
    assert.equal(harness.draftRef.current, harness.initial);
    assert.equal(harness.publishedDraft, undefined);
    assert.equal(harness.phase, undefined);
    assert.equal(harness.sequenceMappers.get(), previousMappers);
    assert.equal(harness.rebuilds.length, 0);
  }
});

test("actual changeSequence defers rebuilding an opening until renderer readiness", () => {
  const harness = editingHarness(0);
  harness.change({ ...harness.initial, openingDuration: 4 });
  assert.equal(harness.rebuilds.length, 0);
  assert.equal(harness.draftRef.current.openingDuration, 4);
});
