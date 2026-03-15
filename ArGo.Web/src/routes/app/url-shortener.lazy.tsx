import { createLazyFileRoute } from '@tanstack/react-router'
import { UrlShortener } from '../../components/UrlShortener'

export const Route = createLazyFileRoute('/app/url-shortener')({
  component: UrlShortener,
})
