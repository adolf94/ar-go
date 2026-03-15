import { createFileRoute } from '@tanstack/react-router'
import { MyItems } from '../../components/MyItems'

export const Route = createFileRoute('/app/dashboard')({
  component: MyItems,
})
