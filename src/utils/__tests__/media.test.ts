import { describe, expect, it } from "vitest";
import { MEDIA_PHOTO_SLOTS } from "../../constants/project";
import { EMPTY_FILTERS } from "../../stores/filtersStore";
import type {
  MediaAudience,
  MediaAuthorization,
  MediaPhoto,
  ProjectMaterial,
  ProjectVideo,
} from "../../types/project";
import {
  canShareMedia,
  getShareableMedia,
  hasMaterialContent,
  hasPhotoContent,
  hasVideoContent,
  isMediaAuthorized,
  makeEmptyMaterial,
  makeEmptyMediaPhoto,
  makeEmptyVideo,
  makeMediaAuthorization,
  materialRowMatcher,
  photoSlots,
  prunePhotoAuthorization,
  videoEmbedUrl,
  withMaterialFile,
  withMaterialLink,
  withPhotoImage,
  withVideoUrl,
} from "../media";
import { filterProjects } from "../search";
import { makeProject } from "./factory";

const NOW = new Date("2026-05-14T00:00:00");

const AUDIENCES: readonly MediaAudience[] = ["coordenacao", "publico"];

const GRANTED: MediaAuthorization = {
  granted: true,
  by: "Karina Marinho",
  at: "2026-08-12",
};

const REFUSED: MediaAuthorization = {
  granted: false,
  by: "Karina Marinho",
  at: "2026-08-12",
};

const IMAGE = { src: "data:image/webp;base64,abc", fileName: "equipe.webp" };

const photo = (authorization: MediaAuthorization | null): MediaPhoto => ({
  image: IMAGE,
  caption: "Entrega do evangelho",
  authorization,
});

const video = (
  authorization: MediaAuthorization | null | undefined,
): ProjectVideo => ({
  url: "https://youtu.be/abc123",
  caption: "Dedicação",
  authorization,
});

describe("isMediaAuthorized", () => {
  it("treats the absence of a decision exactly as a refusal", () => {
    expect(isMediaAuthorized(photo(null))).toBe(false);
    expect(isMediaAuthorized(photo(REFUSED))).toBe(false);
    expect(isMediaAuthorized({})).toBe(false);
  });

  it("only an explicit grant authorizes", () => {
    expect(isMediaAuthorized(photo(GRANTED))).toBe(true);
  });
});

describe("getShareableMedia — every sharing path", () => {
  it("excludes an item with no explicit authorization from every audience, exactly as a refused one", () => {
    for (const undecided of [photo(null), photo(REFUSED)]) {
      const project = makeProject({
        mediaPhotos: [undecided],
        mediaVideos: [video(null), video(undefined), video(REFUSED)],
      });
      for (const audience of AUDIENCES) {
        const shareable = getShareableMedia(project, audience);
        expect(shareable.photos).toEqual([]);
        expect(shareable.videos).toEqual([]);
      }
    }
  });

  it("filters item by item — a granted sibling never carries an undecided one along", () => {
    const granted = photo(GRANTED);
    const undecided = { ...photo(null), caption: "Sem decisão" };
    const refused = { ...photo(REFUSED), caption: "Recusada" };
    const project = makeProject({
      mediaPhotos: [granted, undecided, refused],
      mediaVideos: [video(GRANTED), { ...video(null), caption: "Pendente" }],
    });
    for (const audience of AUDIENCES) {
      const shareable = getShareableMedia(project, audience);
      expect(shareable.photos).toEqual([granted]);
      expect(shareable.videos).toEqual([video(GRANTED)]);
    }
  });

  it("includes an explicitly authorized item for every audience when the project is not sensitive", () => {
    const project = makeProject({
      sensitiveCountry: false,
      mediaPhotos: [photo(GRANTED)],
      mediaVideos: [video(GRANTED)],
    });
    for (const audience of AUDIENCES) {
      const shareable = getShareableMedia(project, audience);
      expect(shareable.photos).toHaveLength(1);
      expect(shareable.videos).toHaveLength(1);
    }
  });

  it("still withholds an authorized item of a sensitive-country project from public output", () => {
    const project = makeProject({
      sensitiveCountry: true,
      mediaPhotos: [photo(GRANTED)],
      mediaVideos: [video(GRANTED)],
    });
    expect(getShareableMedia(project, "publico")).toEqual({
      photos: [],
      videos: [],
      materials: [],
    });
    const coordination = getShareableMedia(project, "coordenacao");
    expect(coordination.photos).toHaveLength(1);
    expect(coordination.videos).toHaveLength(1);
  });

  it("never shares an item without content, even when authorized", () => {
    const project = makeProject({
      mediaPhotos: [{ ...makeEmptyMediaPhoto(), authorization: GRANTED }],
      mediaVideos: [{ ...makeEmptyVideo(), authorization: GRANTED }],
    });
    for (const audience of AUDIENCES) {
      expect(getShareableMedia(project, audience)).toEqual({
        photos: [],
        videos: [],
        materials: [],
      });
    }
  });

  it("never shares a translated material — no material carries a recorded decision yet", () => {
    const material = {
      ...makeEmptyMaterial(),
      kind: "audio" as const,
      scope: "Evangelho de João",
      fileName: "joao.mp3",
      fileSize: 2048,
      dataUrl: "data:audio/mpeg;base64,abc",
      link: "https://drive.example/joao",
      format: "MP3",
      durationSeconds: 272,
    };
    for (const sensitiveCountry of [false, true]) {
      const project = makeProject({ sensitiveCountry, materials: [material] });
      for (const audience of AUDIENCES) {
        expect(getShareableMedia(project, audience).materials).toEqual([]);
        expect(canShareMedia(project, material, audience)).toBe(false);
      }
    }
  });

  it("a future explicit grant flows through the same owner, most restrictive rule still winning", () => {
    const granted = {
      ...makeEmptyMaterial(),
      dataUrl: "data:text/plain;base64,abc",
      fileName: "rute.txt",
      authorization: GRANTED,
    };
    const open = makeProject({ sensitiveCountry: false, materials: [granted] });
    const sensitive = makeProject({
      sensitiveCountry: true,
      materials: [granted],
    });
    expect(getShareableMedia(open, "publico").materials).toEqual([granted]);
    expect(getShareableMedia(sensitive, "publico").materials).toEqual([]);
    expect(getShareableMedia(sensitive, "coordenacao").materials).toEqual([
      granted,
    ]);
  });
});

describe("canShareMedia", () => {
  it("applies the most restrictive rule", () => {
    const sensitive = { sensitiveCountry: true };
    const open = { sensitiveCountry: false };
    expect(canShareMedia(open, photo(GRANTED), "publico")).toBe(true);
    expect(canShareMedia(sensitive, photo(GRANTED), "publico")).toBe(false);
    expect(canShareMedia(sensitive, photo(GRANTED), "coordenacao")).toBe(true);
    expect(canShareMedia(sensitive, photo(null), "coordenacao")).toBe(false);
  });
});

describe("authorization evidence", () => {
  it("records who decided and when", () => {
    expect(makeMediaAuthorization(true, "Karina Marinho", "2026-08-12")).toEqual(
      { granted: true, by: "Karina Marinho", at: "2026-08-12" },
    );
  });

  it("keeps the record total when the session has no resolved name", () => {
    expect(makeMediaAuthorization(false, null, "2026-08-12")).toEqual({
      granted: false,
      by: "",
      at: "2026-08-12",
    });
  });

  it("a new photo or video starts with no authorization", () => {
    expect(makeEmptyMediaPhoto().authorization).toBeNull();
    expect(makeEmptyVideo().authorization).toBeNull();
  });

  it("replacing or removing the image resets the authorization", () => {
    const decided = photo(GRANTED);
    expect(withPhotoImage(decided, IMAGE).authorization).toBeNull();
    expect(withPhotoImage(decided, null).authorization).toBeNull();
    expect(withPhotoImage(decided, null).caption).toBe(decided.caption);
  });

  it("changing the video url resets the authorization", () => {
    const decided = video(GRANTED);
    const next = withVideoUrl(decided, "https://vimeo.com/123");
    expect(next.authorization).toBeNull();
    expect(next.caption).toBe(decided.caption);
  });

  it("replacing a material's file resets the decision and the probed duration", () => {
    const decided = {
      ...makeEmptyMaterial(),
      kind: "audio" as const,
      scope: "Evangelho de João",
      fileName: "antigo.mp3",
      fileSize: 100,
      dataUrl: "data:audio/mpeg;base64,old",
      format: "MP3",
      durationSeconds: 272,
      authorization: GRANTED,
    };
    const replaced = withMaterialFile(decided, {
      fileName: "novo.wav",
      fileSize: 200,
      dataUrl: "data:audio/wav;base64,new",
      format: "WAV",
    });
    expect(replaced.authorization).toBeNull();
    expect(replaced.durationSeconds).toBeUndefined();
    expect(replaced.format).toBe("WAV");
    expect(replaced.scope).toBe(decided.scope);
  });

  it("changing a material's link resets the decision and keeps the file", () => {
    const decided = {
      ...makeEmptyMaterial(),
      fileName: "rute.txt",
      dataUrl: "data:text/plain;base64,abc",
      authorization: GRANTED,
    };
    const next = withMaterialLink(decided, "https://drive.example/rute");
    expect(next.authorization).toBeNull();
    expect(next.link).toBe("https://drive.example/rute");
    expect(next.fileName).toBe("rute.txt");
  });
});

describe("materialRowMatcher", () => {
  const stored = {
    fileName: "joao.mp3",
    fileSize: 2048,
    dataUrl: "data:audio/mpeg;base64,abc",
    format: "MP3",
  };

  it("an in-flight import still lands on its row after the row above is removed", () => {
    const first = { ...makeEmptyMaterial(), scope: "Rute" };
    const second = { ...makeEmptyMaterial(), kind: "audio" as const, scope: "João" };
    const matches = materialRowMatcher(second, 1);
    const afterRemoval = [second];
    const patched = afterRemoval.map((material, i) =>
      matches(material, i) ? withMaterialFile(material, stored) : material,
    );
    expect(patched[0].fileName).toBe("joao.mp3");
    expect(patched[0].scope).toBe("João");
    expect(first.fileName).toBeUndefined();
  });

  it("never patches a different row that inherited the stale position", () => {
    const removed = { ...makeEmptyMaterial(), kind: "audio" as const, scope: "João" };
    const survivor = { ...makeEmptyMaterial(), scope: "Rute" };
    const matches = materialRowMatcher(removed, 0);
    const patched = [survivor].map((material, i) =>
      matches(material, i) ? withMaterialFile(material, stored) : material,
    );
    expect(patched[0]).toBe(survivor);
  });

  it("falls back to the position only for a row without id", () => {
    const legacy: ProjectMaterial = { kind: "text", scope: "Jonas" };
    const other = { ...makeEmptyMaterial(), scope: "Rute" };
    const matches = materialRowMatcher(legacy, 1);
    expect(matches(other, 0)).toBe(false);
    expect(matches(legacy, 1)).toBe(true);
  });
});

describe("content predicates and slots", () => {
  it("an item exists when it has an image or a caption", () => {
    expect(hasPhotoContent(makeEmptyMediaPhoto())).toBe(false);
    expect(hasPhotoContent({ ...makeEmptyMediaPhoto(), caption: "  " })).toBe(
      false,
    );
    expect(hasPhotoContent({ ...makeEmptyMediaPhoto(), caption: "Equipe" })).toBe(
      true,
    );
    expect(hasPhotoContent({ ...makeEmptyMediaPhoto(), image: IMAGE })).toBe(
      true,
    );
  });

  it("a video exists when it has a url", () => {
    expect(hasVideoContent(makeEmptyVideo())).toBe(false);
    expect(hasVideoContent({ ...makeEmptyVideo(), url: "  " })).toBe(false);
    expect(hasVideoContent(video(null))).toBe(true);
  });

  it("a material carries an artifact when it has a file or a link — scope alone is a description", () => {
    const empty = makeEmptyMaterial();
    expect(empty).toMatchObject({
      kind: "text",
      scope: "",
      authorization: null,
    });
    expect(empty.id).toBeTruthy();
    expect(makeEmptyMaterial().id).not.toBe(empty.id);
    expect(hasMaterialContent(makeEmptyMaterial())).toBe(false);
    expect(
      hasMaterialContent({ ...makeEmptyMaterial(), scope: "Evangelho de João" }),
    ).toBe(false);
    expect(hasMaterialContent({ ...makeEmptyMaterial(), link: "  " })).toBe(
      false,
    );
    expect(
      hasMaterialContent({
        ...makeEmptyMaterial(),
        dataUrl: "data:text/plain;base64,abc",
      }),
    ).toBe(true);
    expect(
      hasMaterialContent({
        ...makeEmptyMaterial(),
        link: "https://drive.example/rute",
      }),
    ).toBe(true);
  });

  it("pads the photo grid to the six prototype slots without mutating the source", () => {
    const stored = [photo(null)];
    const slots = photoSlots(stored);
    expect(slots).toHaveLength(MEDIA_PHOTO_SLOTS);
    expect(slots[0]).toEqual(photo(null));
    expect(slots[5]).toEqual(makeEmptyMediaPhoto());
    expect(stored).toHaveLength(1);
    expect(photoSlots(undefined)).toHaveLength(MEDIA_PHOTO_SLOTS);
  });

  it("never truncates a collection longer than the grid", () => {
    const stored = Array.from({ length: MEDIA_PHOTO_SLOTS + 2 }, () =>
      photo(GRANTED),
    );
    expect(photoSlots(stored)).toHaveLength(MEDIA_PHOTO_SLOTS + 2);
  });

  it("an item that loses its content loses the decision with it", () => {
    const captionOnly: MediaPhoto = {
      image: null,
      caption: "Equipe",
      authorization: GRANTED,
    };
    expect(
      prunePhotoAuthorization({ ...captionOnly, caption: "" }).authorization,
    ).toBeNull();
    expect(prunePhotoAuthorization(captionOnly)).toEqual(captionOnly);
  });
});

describe("media facet", () => {
  it("counts an item by its content, not by the row existing", () => {
    const projects = [
      makeProject({ id: "com-foto", mediaPhotos: [photo(null)] }),
      makeProject({ id: "com-video", mediaVideos: [video(null)] }),
      makeProject({ id: "linha-vazia", mediaVideos: [makeEmptyVideo()] }),
      makeProject({ id: "sem-midia" }),
    ];
    const { counts } = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    expect(counts.hasMedia).toEqual({ yes: 2, no: 2 });
  });
});

describe("videoEmbedUrl", () => {
  it("ports the prototype's embed resolution", () => {
    expect(videoEmbedUrl("https://youtu.be/abc-123")).toBe(
      "https://www.youtube.com/embed/abc-123",
    );
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=xyz_9")).toBe(
      "https://www.youtube.com/embed/xyz_9",
    );
    expect(videoEmbedUrl("https://youtube.com/shorts/short1")).toBe(
      "https://www.youtube.com/embed/short1",
    );
    expect(videoEmbedUrl("https://vimeo.com/98765")).toBe(
      "https://player.vimeo.com/video/98765",
    );
    expect(videoEmbedUrl("https://www.youtube.com/embed/keep")).toBe(
      "https://www.youtube.com/embed/keep",
    );
  });

  it("returns null when there is nothing to embed", () => {
    expect(videoEmbedUrl(undefined)).toBeNull();
    expect(videoEmbedUrl("")).toBeNull();
    expect(videoEmbedUrl("https://example.org/filme.mp4")).toBeNull();
  });

  it("never turns an unknown host into an iframe src", () => {
    expect(videoEmbedUrl("https://example.org/embed/x")).toBeNull();
    expect(videoEmbedUrl("http://player.vimeo.com/video/1")).toBeNull();
  });
});
