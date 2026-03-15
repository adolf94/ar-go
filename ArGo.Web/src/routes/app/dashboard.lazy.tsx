import { createLazyFileRoute } from '@tanstack/react-router'
import { MyItems } from '../../components/MyItems'

export const Route = createLazyFileRoute('/app/dashboard')({
  component: MyItems,
})
