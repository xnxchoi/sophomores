import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { filmPoses, studyMotion } from "../lib/invitation/motion";
import { FilmStudy } from "../components/invitation/film-study";

test("film enters and exits in perspective without changing its tokens", () => {
  const before = JSON.stringify(studyMotion);
  const poses = filmPoses(false);
  assert.ok("rotateX" in poses.initial);
  assert.ok("rotateX" in poses.exit);
  assert.ok("rotateX" in poses.animate);
  assert.notEqual(poses.initial.rotateX, 0);
  assert.notEqual(poses.exit.rotateX, 0);
  assert.equal(poses.animate.rotateX, 0);
  assert.equal(JSON.stringify(studyMotion), before);
});

test("reduced film motion has no spatial transforms in any pose", () => {
  const poses = filmPoses(true);
  for (const pose of [poses.initial, poses.animate, poses.exit]) {
    assert.deepEqual(Object.keys(pose), ["opacity"]);
  }
  assert.ok(poses.transition.duration <= 0.2);
});

test("film shell is an honest, labelled study rather than a fake film", () => {
  const html = renderToStaticMarkup(
    <FilmStudy still onModalChange={() => {}} />
  );
  assert.match(html, /<dialog[^>]+aria-labelledby="film-study-heading"/);
  assert.match(html, /Close film study/);
  assert.match(html, /Motion study \/ film not produced/);
  assert.ok(!html.includes("<video"));
  assert.ok(!html.includes("<iframe"));
  assert.match(html, /Preview film transition/);
});

test("configured film is labelled and does not load media before interaction", () => {
  const html = renderToStaticMarkup(
    <FilmStudy
      still
      onModalChange={() => {}}
      media={{
        src: "/fixture.mp4",
        title: "Reference clip",
        credit: "Local reference, not our film"
      }}
    />
  );
  assert.match(html, /Watch reference clip/);
  assert.match(html, /Local reference, not our film/);
  assert.ok(!html.includes('src="/fixture.mp4"'));
});
