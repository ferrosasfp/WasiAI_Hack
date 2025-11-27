"use client";
import * as React from 'react'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'

function createEmotionCache() {
  const cache = createCache({ key: 'css', prepend: true })
  cache.compat = true
  return cache
}

export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createEmotionCache()
    const prevInsert = cache.insert
    let inserted: string[] = []
    cache.insert = (...args: any[]) => {
      const serialized = args[1]
      if (serialized && !cache.inserted[serialized.name]) inserted.push(serialized.name)
      return (prevInsert as any)(...args)
    }
    const flush = () => {
      const prev = inserted
      inserted = []
      return prev
    }
    return { cache, flush }
  })

  useServerInsertedHTML(() => {
    const names = flush()
    if (names.length === 0) return null
    let styles = ''
    for (const name of names) {
      styles += (cache as any).inserted[name]
    }
    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return <CacheProvider value={cache}>{children}</CacheProvider>
}
