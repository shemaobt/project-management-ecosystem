import { describe, expect, it } from "vitest";
import { MEDIA_PHOTO_SLOTS } from "../../constants/project";
import { EMPTY_FILTERS } from "../../stores/filtersStore";
import type {
  MediaAudience,
  MediaAuthorization,
  MediaPhoto,
  ProjectVideo,
} from "../../types/project";
import {
  canShareMedia,
  getShareableMedia,
  hasPhotoContent,
  hasVideoContent,
  isMediaAuthorized,
  makeEmptyMediaPhoto,
  makeEmptyVideo,
  makeMediaAuthorization,
  photoSlots,
  prunePhotoAuthorization,
  videoEmbedUrl,
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
      });
    }
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
});
