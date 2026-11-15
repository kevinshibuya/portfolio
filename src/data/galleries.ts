import type { Bilingual } from '../types/content'

/**
 * What each project page shows, by hand: a few groups of evidence, each with
 * one thing to look at. A row is one recording across the page (`full`), two
 * screens side by side (`pair`), a screen with its phone counterpart
 * (`duo`), or three phone screens (`phones`). Ids are those of `media.json`;
 * what is not named here stays in the manifest and is shown on the work index.
 */
export type RowLayout = 'full' | 'pair' | 'duo' | 'phones'

export interface EvidenceRowPlan {
  layout: RowLayout
  items: string[]
}

export interface EvidenceGroupPlan {
  label: Bilingual
  rows: EvidenceRowPlan[]
}

const PHONE: Bilingual = { en: 'on a phone', pt: 'no celular' }

export const galleries: Record<string, EvidenceGroupPlan[]> = {
  'enquetes-gzh': [
    {
      label: { en: 'back office', pt: 'back-office' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d03', 'd04'] },
      ],
    },
    { label: { en: 'the embed', pt: 'o embed' }, rows: [{ layout: 'duo', items: ['c03', 'c04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['m02', 'm03', 'm04'] }] },
  ],
  'radar-legislativo': [
    {
      label: { en: 'public site', pt: 'site público' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d04', 'd06'] },
      ],
    },
    { label: { en: 'back office', pt: 'back-office' }, rows: [{ layout: 'duo', items: ['c05', 'm05'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['c04', 'm02', 'm03'] }] },
  ],
  'painel-da-reconstrucao': [
    {
      label: { en: 'where the money goes', pt: 'para onde vai o dinheiro' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d02', 'd04'] },
      ],
    },
    { label: { en: 'roads and works', pt: 'estradas e obras' }, rows: [{ layout: 'duo', items: ['c03', 'm04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['c04', 'm02', 'm03'] }] },
  ],
  'chat-da-hora': [
    {
      label: { en: 'a question, an answer', pt: 'uma pergunta, uma resposta' },
      rows: [
        { layout: 'full', items: ['d01'] },
        { layout: 'pair', items: ['d03', 'd04'] },
      ],
    },
    { label: PHONE, rows: [{ layout: 'phones', items: ['c02', 'm01', 'm03'] }] },
  ],
  'peleia-gre-nal': [
    {
      label: { en: 'a round', pt: 'uma rodada' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d03', 'd05'] },
      ],
    },
    { label: { en: 'the last round', pt: 'a última rodada' }, rows: [{ layout: 'duo', items: ['c03', 'm04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['c04', 'm01', 'm02'] }] },
  ],
  'fotos-do-ano-2025': [
    {
      label: { en: 'a photographer’s section', pt: 'a seção de um fotógrafo' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d02', 'd05'] },
      ],
    },
    { label: { en: 'the lightbox', pt: 'o lightbox' }, rows: [{ layout: 'duo', items: ['c03', 'c04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['m02', 'm03', 'm04'] }] },
  ],
  'hotmart-bunde': [
    {
      label: { en: 'the journey', pt: 'a jornada' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d02', 'd03'] },
      ],
    },
    { label: { en: 'the modules', pt: 'os módulos' }, rows: [{ layout: 'duo', items: ['c03', 'c04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['m02', 'm03', 'm04'] }] },
  ],
  'fotos-do-ano-2024': [
    {
      label: { en: 'a photographer’s section', pt: 'a seção de um fotógrafo' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d02', 'd05'] },
      ],
    },
    { label: { en: 'video testimonials', pt: 'depoimentos em vídeo' }, rows: [{ layout: 'duo', items: ['c03', 'c04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['m02', 'm03', 'm04'] }] },
  ],
  'ia-na-redacao': [
    {
      label: { en: 'video testimonials', pt: 'depoimentos em vídeo' },
      rows: [
        { layout: 'full', items: ['c02'] },
        { layout: 'pair', items: ['d01', 'd04'] },
      ],
    },
    { label: { en: 'articles', pt: 'artigos' }, rows: [{ layout: 'duo', items: ['c03', 'm04'] }] },
    { label: PHONE, rows: [{ layout: 'phones', items: ['c04', 'm02', 'm03'] }] },
  ],
  promptfall: [
    {
      label: { en: 'the band', pt: 'a faixa' },
      rows: [
        { layout: 'full', items: ['d03'] },
        { layout: 'pair', items: ['d04', 'd06'] },
      ],
    },
    { label: { en: 'the pane', pt: 'o painel' }, rows: [{ layout: 'pair', items: ['d01', 'd07'] }] },
    {
      label: { en: 'the art', pt: 'a arte' },
      rows: [
        { layout: 'full', items: ['d08'] },
        { layout: 'duo', items: ['d02', 'm01'] },
      ],
    },
  ],
  'barber-app': [
    { label: { en: 'the bake-off', pt: 'o teste de provedores' }, rows: [{ layout: 'full', items: ['d02'] }] },
    { label: { en: 'in the chair', pt: 'na cadeira' }, rows: [{ layout: 'phones', items: ['m03', 'm04', 'm01'] }] },
    { label: { en: 'the look', pt: 'o visual' }, rows: [{ layout: 'phones', items: ['m02', 'm05', 'm07'] }] },
    { label: { en: 'the owner', pt: 'o dono' }, rows: [{ layout: 'phones', items: ['m06'] }] },
  ],
}
