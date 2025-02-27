import { decode } from 'html-entities'

export function decodeHtml(text: string): string {
    return decode(text)
}
