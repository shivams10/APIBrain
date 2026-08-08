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
  const response = await fetch(url);
  if (!response.ok) {
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