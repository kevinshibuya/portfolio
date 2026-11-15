import { describe, it, expect } from 'vitest'
import { cleanTitle, splitLine } from '../../../src/data/embeds'

describe('splitLine', () => {
  it('splits a plain line on semicolons, keeping empty trailing fields', () => {
    expect(splitLine('01/12/2023;Esporte;QUIZ;;')).toEqual(['01/12/2023', 'Esporte', 'QUIZ', '', ''])
  })

  it('unwraps a quoted field', () => {
    expect(splitLine('a;"Comprar ou assinar um carro?";b')).toEqual(['a', 'Comprar ou assinar um carro?', 'b'])
  })

  it('reads a doubled quote inside a quoted field as one literal quote', () => {
    expect(splitLine('a;"Quem matou sobre ""Vale Tudo""";b')).toEqual(['a', 'Quem matou sobre "Vale Tudo"', 'b'])
  })

  it('keeps a semicolon inside quotes in its field', () => {
    const fields = splitLine('11/12/2023;Coordenação;PROGRAMAÇÃO;QUIZ;https://example.com;"Antes; depois";;')
    expect(fields).toHaveLength(8)
    expect(fields[5]).toBe('Antes; depois')
    expect(fields[6]).toBe('')
  })
})

describe('cleanTitle', () => {
  it('drops quotes that wrap the whole title', () => {
    expect(cleanTitle(splitLine('"""Quem Quer Ser Um Milionário?"""')[0])).toBe('Quem Quer Ser Um Milionário?')
  })

  it('sets a quoted name inside a title in typographic quotes', () => {
    expect(cleanTitle('Quem matou sobre "Vale Tudo"')).toBe('Quem matou sobre “Vale Tudo”')
  })

  it('trims a trailing separator', () => {
    expect(cleanTitle('Simulador Brasileirão 2023; ')).toBe('Simulador Brasileirão 2023')
  })
})
