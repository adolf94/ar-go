import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$shortCode')({
  loader: ({ params }) => {
    const { shortCode } = params
    
    // Safety check: if for some reason it matches a route that should have been static
    // (though TanStack ranking should handle this), we can guard here.
    if (shortCode === 'app') return
    
    window.location.href = `${window.webConfig.api}/${shortCode}`
  },
  component: RedirectComponent,
})

function RedirectComponent() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      gap: '1rem'
    }}>
      <h1 className="gradient-text" style={{ fontSize: '3rem' }}>ArGo</h1>
      <p style={{ color: '#666' }}>Redirecting to your link...</p>
    </div>
  )
}
