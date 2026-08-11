import { PDFParse } from "pdf-parse";
import * as cheerio from "cheerio";
import type { SourceType } from "../generated/prisma/enums";


async function extractFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

function extractFromMarkdown(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

async function extractFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    const isBotChallenge =
      response.headers.get("cf-mitigated") === "challenge" || (await response.text()).includes("Just a moment");
    if (isBotChallenge) {
      throw new Error(
        `${url} blocked automated access with a bot challenge (not a transient error) — try a different source, or upload the content as a file instead.`,
      );
    }
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function extractText(sourceType: SourceType, source: Buffer | string): Promise<string> {
  switch (sourceType) {
    case "PDF":
      return extractFromPdf(source as Buffer);
    case "MARKDOWN":
      return extractFromMarkdown(source as Buffer);
    case "URL":
      return extractFromUrl(source as string);
  }
}