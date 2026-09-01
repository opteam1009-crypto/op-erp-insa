import { describe, it, expect } from 'vitest'
import { buttonClass } from './button-class'

describe('buttonClass', () => {
  it('defaults to the primary variant at md size', () => {
    const cls = buttonClass()
    expect(cls).toContain('bg-accent')
    expect(cls).toContain('h-9')
  })

  it('renders the secondary variant with a border', () => {
    expect(buttonClass('secondary')).toContain('border-border-strong')
  })

  it('renders the danger variant in the negative colour', () => {
    expect(buttonClass('danger')).toContain('text-negative')
  })

  it('renders the ghost variant without a background', () => {
    expect(buttonClass('ghost')).not.toContain('bg-accent')
  })

  it('applies the small size', () => {
    expect(buttonClass('primary', 'sm')).toContain('h-8')
  })

  it('makes the icon size square', () => {
    const cls = buttonClass('ghost', 'icon')
    expect(cls).toContain('h-8')
    expect(cls).toContain('w-8')
  })

  it('appends extra classes at the end', () => {
    expect(buttonClass('primary', 'md', 'w-full').endsWith('w-full')).toBe(true)
  })

  it('omits a falsy extra without leaving a trailing space', () => {
    expect(buttonClass('primary', 'md')).toBe(buttonClass('primary', 'md').trim())
  })

  it('always includes a full-opacity, offset focus ring (3:1 against the page background)', () => {
    for (const v of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const cls = buttonClass(v)
      expect(cls).toContain('focus-visible:ring-2')
      // Full-opacity accent, not a faded ring/40 or ring/25 that falls below 3:1.
      expect(cls).toContain('focus-visible:ring-accent')
      expect(cls).not.toMatch(/focus-visible:ring-accent\/\d+/)
      // Offset so the ring is visually separated from the control it outlines.
      expect(cls).toContain('focus-visible:ring-offset-2')
      expect(cls).toContain('focus-visible:ring-offset-bg')
    }
  })
})
