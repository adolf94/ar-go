import { createFileRoute } from '@tanstack/react-router'
import { UrlShortener } from '../../components/UrlShortener'

export const Route = createFileRoute('/app/url-shortener')({
  component: UrlShortener,
})
