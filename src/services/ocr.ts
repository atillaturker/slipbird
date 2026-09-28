import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

import { joinPages } from '@/lib/ocr-text';

/**
 * On-device OCR with ML Kit (Latin script covers English and Turkish). Keeps ML Kit's block and line
 * order. Images never leave the device; only this text does (to parse-receipt).
 */
export async function recognizePages(pages: string[]): Promise<string> {
  const texts: string[] = [];
  for (const page of pages) {
    const uri = page.startsWith('/') ? `file://${page}` : page;
    const result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
    texts.push(result.blocks.map((block) => block.lines.map((line) => line.text).join('\n')).join('\n'));
  }
  return joinPages(texts);
}
