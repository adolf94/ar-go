import { createLazyFileRoute } from '@tanstack/react-router'
import { FileDrop } from '../../components/FileDrop'

export const Route = createLazyFileRoute('/app/file-drop')({
  component: FileDrop,
})
