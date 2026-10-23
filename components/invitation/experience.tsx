"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvitationForm } from "./invitation-form";
import { FilmStudy } from "./film-study";
import { referenceFilm } from "@/lib/invitation/reference-media";

const StudyLight = dynamic(
  () => import("./study-light").then((module) => module.StudyLight),
  {
    ssr: false
  }
);

export function InvitationStudy() {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState(false);
  const still =  paused;

  return (
    <div className="invitation-study" data-still={still || undefined}>
      <div className="invitation-study-light" aria-hidden="true">
        <StudyLight paused={still || modal} />
      </div>
      <header className="invitation-study-header">
        <Link href="/" className="invitation-study-wordmark">
          sophomores
        </Link>
        <nav aria-label="Local studies">
          <a href="/studies/intro">Intro</a>
          <a href="/studies/tickets">Tickets</a>
          <a href="#film-study">Film</a>
        </nav>
      </header>
      <main>
        <h1 className="invitation-study-sr-only">
          Invitation interaction study
        </h1>
        <noscript>
          <p className="invitation-study-no-script">
            This local form study needs JavaScript. No registration is available
            here.
          </p>
        </noscript>
        <InvitationForm
          still={still}
          onExit={() => router.push("/studies/intro")}
        />
        <section
          className="invitation-study-film-section"
          id="film-study"
          aria-labelledby="film-section-heading"
        >
          <div>
            <p className="invitation-study-label">02 / The film</p>
            <h2
              id="film-section-heading"
              className="my-[18px] font-teaser-serif text-[clamp(32px,4vw,52px)] font-normal leading-[1.12] [text-wrap:balance]"
            >
              The voices come first.
            </h2>
            <p>
              A reference clip to test the entrance, playback and exit. Our own
              film is still to be made.
            </p>
          </div>
          <FilmStudy
            still={still}
            onModalChange={setModal}
            media={referenceFilm}
          />
          <p className="invitation-study-media-note">
            The clip loads from Analogue’s media host only when opened. Their
            edit is a reference, not a licensed launch asset. A caption-track
            and transcript slot are ready for our film; the reference has no
            verified transcript here.
          </p>
        </section>
      </main>
      <footer className="invitation-study-footer">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={still}
        >
          { paused
              ? "Resume motion"
              : "Pause motion"}
        </button>
        <span>Local study · no registration service connected</span>
      </footer>
    </div>
  );
}
