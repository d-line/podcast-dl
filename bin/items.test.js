import path from "path";
import { describe, expect, it } from "vitest";
import { getItemsToDownload } from "./items.js";

describe("getItemsToDownload", () => {
  const getArtifactPaths = ({ imageUrl, transcriptType, transcriptUrl }) => {
    const item = {
      title: "Episode",
      enclosure: {
        type: "audio/mpeg",
        url: "https://example.com/episode.mp3",
      },
      image: imageUrl ? { url: imageUrl } : undefined,
      podcastTranscripts: transcriptUrl
        ? [{ $: { type: transcriptType, url: transcriptUrl } }]
        : undefined,
    };
    const feed = { items: [item], title: "Example Podcast" };
    const [result] = getItemsToDownload({
      archivePrefix: "example",
      basePath: "/downloads",
      episodeDigits: 1,
      episodeNumOffset: 0,
      episodeTemplate: "{{title}}",
      episodeTranscriptTypes: [transcriptType],
      feed,
      includeEpisodeImages: Boolean(imageUrl),
      includeEpisodeTranscripts: Boolean(transcriptUrl),
      offset: 0,
    });

    return {
      image: result._episodeImage?.outputPath,
      transcript: result._episodeTranscript?.outputPath,
    };
  };

  it.each([
    ["https://example.com/image.jpg", "Episode.jpg"],
    ["https://example.com/image", "Episode.image"],
  ])("plans image URL %s as %s", (imageUrl, expectedFilename) => {
    expect(getArtifactPaths({ imageUrl }).image).toBe(path.resolve("/downloads", expectedFilename));
  });

  it.each([
    ["text/vtt", "https://example.com/transcript.vtt", "Episode.vtt"],
    ["text/srt", "https://example.com/transcript.srt", "Episode.srt"],
    ["text/html", "https://example.com/transcript", "Episode.html"],
    ["text/plain", "https://example.com/transcript", "Episode.txt"],
    ["application/unknown", "https://example.com/transcript", "Episode.transcript"],
    [undefined, "https://example.com/transcript", "Episode.transcript"],
  ])("plans a %s transcript URL as %s", (transcriptType, transcriptUrl, expectedFilename) => {
    expect(getArtifactPaths({ transcriptType, transcriptUrl }).transcript).toBe(
      path.resolve("/downloads", expectedFilename),
    );
  });

  it("keeps NPR-style extensionless image and transcript paths distinct", () => {
    const paths = getArtifactPaths({
      imageUrl:
        "https://example.com/resize/300/format/png/?url=https%3A%2F%2Fexample.com%2Fimage.png",
      transcriptType: "text/html",
      transcriptUrl: "https://example.com/transcripts/nx-s1-5855738",
    });

    expect(paths).toEqual({
      image: path.resolve("/downloads", "Episode.image"),
      transcript: path.resolve("/downloads", "Episode.html"),
    });
  });

  it("applies custom template options to transcript filenames", () => {
    const item = {
      title: "Episode S01E02",
      enclosure: {
        type: "audio/mpeg",
        url: "https://example.com/episode.mp3",
      },
      podcastTranscripts: [
        {
          $: {
            type: "text/vtt",
            url: "https://example.com/transcript.vtt",
          },
        },
      ],
    };
    const feed = { items: [item], title: "Example Podcast" };

    const [result] = getItemsToDownload({
      archivePrefix: "example",
      basePath: "/downloads",
      episodeCustomTemplateOptions: ["S\\d+E\\d+"],
      episodeDigits: 1,
      episodeNumOffset: 0,
      episodeTemplate: "{{custom_0}}-{{title}}",
      episodeTranscriptTypes: ["text/vtt"],
      feed,
      includeEpisodeTranscripts: true,
      offset: 0,
    });

    expect(result._episodeTranscript.outputPath).toBe(
      path.resolve("/downloads", "S01E02-Episode S01E02.vtt"),
    );
  });
});
