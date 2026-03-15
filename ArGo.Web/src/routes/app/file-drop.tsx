import { createFileRoute } from '@tanstack/react-router'
import { FileDrop } from '../../components/FileDrop'

export const Route = createFileRoute('/app/file-drop')({
  component: FileDrop,
})
